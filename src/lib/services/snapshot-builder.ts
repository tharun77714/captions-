import { createClient } from '@supabase/supabase-js';

export class SnapshotBuilder {
  static async build(projectId: string): Promise<any> {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const { data: transcription, error: transError } = await supabaseAdmin
      .from('transcriptions')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (transError || !transcription) {
      throw new Error(`Transcription not found for project: ${projectId}`);
    }

    return {
      schema_version: 4,
      engine_version: "1.0.0",
      projectId: project.id,
      dimensions: {
        width: 1080,
        height: 1920
      },
      fps: 30,
      backgroundVideo: {
        url: project.media_url,
        duration: project.duration_ms / 1000.0,
        trim: {
          start: 0.0,
          end: project.duration_ms / 1000.0
        }
      },
      subtitleStyle: project.subtitle_style || {
        _version: 3,
        font: { family: "Inter", weight: 700, italic: false, underline: false, textTransform: "none" },
        fontSize: 24.0,
        letterSpacing: 0.0,
        wordSpacing: 0.0,
        lineSpacing: 1.2,
        textColor: { mode: "solid", solid: "#FFFFFF" },
        stroke: { enabled: false, color: "#000000", width: 0.0 },
        shadow: { color: "rgba(0,0,0,0.5)", blur: 0.0, offsetX: 0.0, offsetY: 0.0 },
        background: { enabled: false, color: "rgba(0,0,0,0.75)", opacity: 1.0, paddingX: 0.0, paddingY: 0.0, borderRadius: 0.0 },
        blur: 0.0,
        alignment: "center",
        positionX: 0.0,
        positionY: 0.0,
        highlightMode: "none",
        activeWordColor: "#FFFFFF",
        inactiveOpacity: 0.5,
        transition: { type: "none", target: "word", speedMode: "dynamic", speed: 25 },
        overrides: { wordStyles: {}, segmentStyles: {} }
      },
      segments: transcription.segments || []
    };
  }
}
