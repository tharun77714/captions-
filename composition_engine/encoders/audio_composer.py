import asyncio
import os
from pathlib import Path
from typing import Dict, Any, List
from composition_engine.encoders.base import (
    AudioComposer,
    Muxer,
    AudioExecutionPlan,
    AssetManifest,
    FilterGraph,
    EncoderError
)

class FFmpegAudioComposer(AudioComposer):
    def __init__(self):
        self._process = None

    async def compose(self, plan: AudioExecutionPlan, manifest: AssetManifest, output_path: Path, session_id: str) -> Path:
        graph = plan.filter_graph
        
        # If the graph has no nodes, output a silent audio track matching the duration
        if not graph.nodes:
            # Generate a silent wav file
            cmd = [
                "ffmpeg", "-y",
                "-f", "lavfi",
                "-i", f"anullsrc=r=48000:cl=stereo",
                "-t", str(plan.expected_duration),
                "-c:a", "pcm_s16le",
                str(output_path)
            ]
            self._process = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
            try:
                stdout, stderr = await self._process.communicate()
                exit_code = self._process.returncode
            finally:
                self._process = None
            if exit_code != 0:
                raise EncoderError("SILENT_GEN_FAILED", f"Failed to generate silent audio: {stderr.decode('utf-8', errors='ignore')}", session_id)
            return output_path

        # Parse the FilterGraph to construct FFmpeg filter complex arguments
        inputs = []
        filter_complex_parts = []
        
        # Map input node IDs to input file indices
        input_index_map = {}
        input_nodes = [node for node in graph.nodes if node.filter_name == "input"]
        
        for idx, node in enumerate(input_nodes):
            path = node.params["path"]
            inputs.extend(["-i", path])
            input_index_map[node.node_id] = idx

        # Find the edges entering each node
        incoming_edges = {}
        for edge in graph.edges:
            incoming_edges.setdefault(edge.target_node_id, []).append(edge)

        # Topological traversal / processing of nodes
        # In our builder, each clip chain is linear: input -> trim -> fade -> volume -> delay
        # Let's map each node ID to its output pad name
        pad_names = {}

        for node in graph.nodes:
            if node.filter_name == "input":
                idx = input_index_map[node.node_id]
                pad_names[node.node_id] = f"[{idx}:a]"
                continue

            # Get incoming pads
            in_edges = incoming_edges.get(node.node_id, [])
            in_pads = [pad_names[edge.source_node_id] for edge in in_edges]
            in_pads_str = "".join(in_pads)
            
            out_pad = f"[{node.node_id}]"
            pad_names[node.node_id] = out_pad

            # Build filter string
            if node.filter_name == "atrim":
                start = node.params.get("start", 0.0)
                end = node.params.get("end", 0.0)
                # Ensure we reset timestamps after trim
                if end > 0:
                    filt = f"atrim=start={start}:end={end},asetpts=PTS-STARTPTS"
                else:
                    filt = f"atrim=start={start},asetpts=PTS-STARTPTS"
            
            elif node.filter_name == "afade":
                fade_in = node.params.get("fade_in", 0.0)
                fade_out = node.params.get("fade_out", 0.0)
                duration = node.params.get("duration", 0.0)
                
                filters = []
                if fade_in > 0:
                    filters.append(f"afade=t=in:ss=0:d={fade_in}")
                if fade_out > 0:
                    st_time = max(0.0, duration - fade_out)
                    filters.append(f"afade=t=out:st={st_time}:d={fade_out}")
                
                filt = ",".join(filters) if filters else "anull"

            elif node.filter_name == "volume":
                vol = node.params.get("volume", 1.0)
                filt = f"volume={vol}"

            elif node.filter_name == "adelay":
                delay_ms = node.params.get("delay_ms", 0)
                # adelay format: delay_ms|delay_ms for stereo
                filt = f"adelay={delay_ms}|{delay_ms}"

            elif node.filter_name == "amix":
                num_inputs = node.params.get("inputs", 1)
                filt = f"amix=inputs={num_inputs}:duration=first:dropout_transition=0"

            else:
                filt = "anull"

            # Add to filter complex string
            filter_complex_parts.append(f"{in_pads_str}{filt}{out_pad}")

        filter_complex_str = ";".join(filter_complex_parts)

        # Output pad name (the final output of the graph)
        out_pad = pad_names[graph.outputs[0]]

        # Command arguments
        cmd = ["ffmpeg", "-y"]
        cmd.extend(inputs)
        cmd.extend([
            "-filter_complex", filter_complex_str,
            "-map", out_pad,
            "-c:a", "pcm_s16le",
            str(output_path)
        ])

        # Spawn FFmpeg subprocess
        self._process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        try:
            stdout, stderr = await self._process.communicate()
            exit_code = self._process.returncode
        finally:
            self._process = None

        if exit_code != 0:
            err_msg = stderr.decode("utf-8", errors="ignore")
            raise EncoderError(
                code="MIX_FAILED",
                message=f"FFmpeg audio mixing failed with exit code {exit_code}. Stderr:\n{err_msg}",
                session_id=session_id
            )

        return output_path

    async def terminate(self) -> None:
        if self._process:
            try:
                self._process.kill()
                await self._process.wait()
            except Exception:
                pass
            finally:
                self._process = None


class FFmpegMuxer(Muxer):
    async def mux(self, video_path: Path, audio_path: Path, output_path: Path, session_id: str) -> None:
        # Combines silent video and mixed audio into a single container
        # Copy video codec (-c:v copy) to keep pixel-identical render frames!
        # Encode audio to AAC (-c:a aac)
        cmd = [
            "ffmpeg", "-y",
            "-i", str(video_path),
            "-i", str(audio_path),
            "-c:v", "copy",
            "-c:a", "aac",
            "-shortest",
            str(output_path)
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            err_msg = stderr.decode("utf-8", errors="ignore")
            raise EncoderError(
                code="MUX_FAILED",
                message=f"FFmpeg muxing failed with exit code {process.returncode}. Stderr:\n{err_msg}",
                session_id=session_id
            )
