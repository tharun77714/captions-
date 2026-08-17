import React, { useState, useEffect, useRef } from 'react';
import { Wand2, Sparkles, X, Minimize2, Type, Eraser, Smile, Flame, Upload, BookOpen, AlertCircle, Edit2, Trash2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useEditorStore } from '@/store/editor-store';
import { parseSrt, parseVtt, ParsedCue, findOverlappingCues, autoFixOverlaps, OverlapReport } from '@/lib/srt-export';
import { getDictionaryRules, saveDictionaryRule, updateDictionaryRule, deleteDictionaryRule, DictionaryRule } from '@/lib/custom-dictionary';

function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  const [show, setShow] = useState(false);
  return (
    <div 
      className="relative flex items-center justify-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-zinc-800 text-zinc-200 text-[10px] font-medium px-2 py-1 rounded shadow-lg z-50 border border-white/10 pointer-events-none">
          {content}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-800 border-b border-r border-white/10 rotate-45" />
        </div>
      )}
    </div>
  );
}

interface CaptionToolsProps {
  userId?: string;
}

export function CaptionTools({ userId }: CaptionToolsProps) {
  const {
    autoLineBreak,
    removeFillers,
    removePunctuation,
    removeEmojis,
    restoreEmphasis,
    removeGaps,
    applyAiEmojis,
    applyAiHighlighting,
    importSubtitleSegments,
    applyDictionaryReplacements,
    subtitleMode,
  } = useEditorStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Import Subtitles Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedCues, setImportedCues] = useState<ParsedCue[] | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const [overlapReports, setOverlapReports] = useState<OverlapReport[]>([]);

  // Custom Dictionary Modal State
  const [showDictModal, setShowDictModal] = useState(false);
  const [dictRules, setDictRules] = useState<DictionaryRule[]>([]);
  const [newSearch, setNewSearch] = useState('');
  const [newReplace, setNewReplace] = useState('');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editSearch, setEditSearch] = useState('');
  const [editReplace, setEditReplace] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [dictError, setDictError] = useState<string | null>(null);
  const [dictSuccess, setDictSuccess] = useState<string | null>(null);

  const activeUserId = userId || '';

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeImportModal();
        closeDictModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportedCues(null);
    setImportFileName('');
    setImportError(null);
    setOverlapReports([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const closeDictModal = () => {
    setShowDictModal(false);
    setEditingRuleId(null);
    setDeleteConfirmId(null);
    setDictError(null);
    setDictSuccess(null);
  };

  const openDictModal = () => {
    if (!activeUserId) {
      setDictError('Sign in required to access custom dictionary.');
    } else {
      setDictRules(getDictionaryRules(activeUserId));
      setDictError(null);
    }
    setDictSuccess(null);
    setShowDictModal(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setOverlapReports([]);
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Extension validation (case-insensitive)
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.srt') && !lowerName.endsWith('.vtt')) {
      setImportError('Unsupported file type. Please upload a valid .srt or .vtt subtitle file.');
      setImportedCues(null);
      return;
    }

    // 2. File size limit (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setImportError('File exceeds maximum 5MB size limit.');
      setImportedCues(null);
      return;
    }

    setImportFileName(file.name);
    const reader = new FileReader();

    reader.onerror = () => {
      setImportError('Failed to read file content. Please try another file.');
      setImportedCues(null);
    };

    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text || !text.trim()) {
        setImportError('Selected file is empty.');
        setImportedCues(null);
        return;
      }

      let cues: ParsedCue[] = [];
      if (lowerName.endsWith('.vtt')) {
        cues = parseVtt(text);
      } else {
        cues = parseSrt(text);
      }

      if (cues.length === 0) {
        setImportError('Could not parse any valid subtitle cues. Ensure timestamps and formatting are valid.');
        setImportedCues(null);
      } else {
        const overlaps = findOverlappingCues(cues);
        setOverlapReports(overlaps);
        setImportedCues(cues);
      }
    };
    reader.readAsText(file);
  };

  const handleAutoFixOverlaps = () => {
    if (!importedCues) return;
    const fixed = autoFixOverlaps(importedCues);
    setImportedCues(fixed);
    setOverlapReports(findOverlappingCues(fixed));
  };

  const confirmImport = () => {
    if (!importedCues || importedCues.length === 0) return;
    if (overlapReports.length > 0) {
      setImportError('Please resolve or auto-fix overlapping cues before replacing captions.');
      return;
    }
    importSubtitleSegments(subtitleMode, importedCues);
    closeImportModal();
  };

  const handleAddDictRule = () => {
    setDictError(null);
    setDictSuccess(null);
    if (!activeUserId) {
      setDictError('Sign in required to add dictionary rules.');
      return;
    }
    const result = saveDictionaryRule(activeUserId, newSearch, newReplace);
    if (!result.success) {
      setDictError(result.error || 'Failed to add rule');
      return;
    }
    setNewSearch('');
    setNewReplace('');
    setDictRules(getDictionaryRules(activeUserId));
    setDictSuccess('Rule saved to custom dictionary (not applied to captions yet).');
  };

  const startEditRule = (rule: DictionaryRule) => {
    setEditingRuleId(rule.id);
    setEditSearch(rule.search);
    setEditReplace(rule.replaceWith);
    setDictError(null);
    setDictSuccess(null);
  };

  const handleSaveEditRule = () => {
    if (!editingRuleId || !activeUserId) return;
    const result = updateDictionaryRule(activeUserId, editingRuleId, editSearch, editReplace);
    if (!result.success) {
      setDictError(result.error || 'Failed to update rule');
      return;
    }
    setEditingRuleId(null);
    setDictRules(getDictionaryRules(activeUserId));
    setDictSuccess('Rule updated successfully.');
  };

  const handleDeleteRule = (ruleId: string) => {
    if (!activeUserId) return;
    deleteDictionaryRule(activeUserId, ruleId);
    setDictRules(getDictionaryRules(activeUserId));
    setDeleteConfirmId(null);
    setDictSuccess('Rule deleted.');
  };

  const handleApplyRules = (rulesToApply: DictionaryRule[], applyAll: boolean) => {
    setDictError(null);
    setDictSuccess(null);
    if (rulesToApply.length === 0) return;

    const result = applyDictionaryReplacements(rulesToApply, applyAll, subtitleMode);
    if (result.replacementsCount > 0) {
      setDictSuccess(`Applied rule(s). Replaced ${result.replacementsCount} matching word(s) in ${subtitleMode} mode.`);
    } else {
      setDictError(`No matching words found in current ${subtitleMode} captions.`);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 bg-zinc-900/90 p-1 rounded-lg border border-white/5 shadow-inner">
      <Tooltip content="AI Emojis Overlay (Beast Mode)">
        <button
          onClick={applyAiEmojis}
          className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 hover:from-violet-600/30 hover:to-fuchsia-600/30 border border-violet-500/30 text-violet-300 rounded text-[11px] font-medium transition-all hover:scale-[1.02]"
        >
          <Smile className="w-3.5 h-3.5 text-fuchsia-400 animate-pulse" />
          <span>AI Emojis</span>
        </button>
      </Tooltip>

      <Tooltip content="AI Keyword Color Highlights">
        <button
          onClick={applyAiHighlighting}
          className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/30 text-amber-300 rounded text-[11px] font-medium transition-all hover:scale-[1.02]"
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>AI Keywords</span>
        </button>
      </Tooltip>

      <div className="h-4 w-px bg-white/10 mx-0.5" />

      {/* Import SRT / VTT Button */}
      <Tooltip content="Import Subtitle File (.srt / .vtt)">
        <button
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-200 rounded text-[11px] font-medium transition-colors"
        >
          <Upload className="w-3 h-3 text-cyan-400" />
          <span>Import Subtitles</span>
        </button>
      </Tooltip>

      {/* Custom Dictionary Button */}
      <Tooltip content="Custom Spelling Dictionary (Indian Loanwords & Brand Names)">
        <button
          onClick={openDictModal}
          className="flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-200 rounded text-[11px] font-medium transition-colors"
        >
          <BookOpen className="w-3 h-3 text-emerald-400" />
          <span>Dictionary</span>
        </button>
      </Tooltip>

      <div className="h-4 w-px bg-white/10 mx-0.5" />

      <Tooltip content="Remove Fillers (um, uh, like...)">
        <button
          onClick={removeFillers}
          className="p-1.5 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 rounded transition-colors"
        >
          <Sparkles className="w-4 h-4" />
        </button>
      </Tooltip>

      <Tooltip content="Auto Line Break (42 chars)">
        <button
          onClick={() => autoLineBreak(42)}
          className="p-1.5 text-zinc-400 hover:text-violet-400 hover:bg-zinc-800 rounded transition-colors"
        >
          <Wand2 className="w-4 h-4" />
        </button>
      </Tooltip>

      <Tooltip content="Remove Silence & Gaps">
        <button
          onClick={removeGaps}
          className="p-1.5 text-zinc-400 hover:text-violet-400 hover:bg-zinc-800 rounded transition-colors"
        >
          <Minimize2 className="w-4 h-4" />
        </button>
      </Tooltip>

      <Tooltip content="Restore Emphasis">
        <button
          onClick={restoreEmphasis}
          className="p-1.5 text-zinc-400 hover:text-violet-400 hover:bg-zinc-800 rounded transition-colors"
        >
          <Type className="w-4 h-4" />
        </button>
      </Tooltip>

      <Tooltip content="Remove Punctuation">
        <button
          onClick={removePunctuation}
          className="p-1.5 text-zinc-400 hover:text-violet-400 hover:bg-zinc-800 rounded transition-colors"
        >
          <Eraser className="w-4 h-4" />
        </button>
      </Tooltip>

      <Tooltip content="Clear All Emojis">
        <button
          onClick={removeEmojis}
          className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </Tooltip>

      {/* ─── IMPORT SUBTITLES MODAL ────────────────────────────────────────────── */}
      {showImportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={closeImportModal}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">Import Subtitles (.srt / .vtt)</h3>
              </div>
              <button onClick={closeImportModal} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-zinc-400">
                Target mode: <span className="font-semibold text-violet-400 uppercase">{subtitleMode}</span>.
                Importing will replace captions in <span className="underline">{subtitleMode}</span> mode only. You can undo this action.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".srt,.vtt,text/plain"
                onChange={handleFileSelect}
                className="block w-full text-xs text-zinc-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-500 cursor-pointer"
              />

              <p className="text-[11px] text-zinc-500 italic">
                Note: Word timestamps are estimated proportionally (<code className="text-cyan-400 font-mono">timingSource: synthetic</code>).
              </p>

              {importError && (
                <div className="flex items-center gap-2 p-2.5 bg-rose-950/60 border border-rose-500/30 rounded-lg text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{importError}</span>
                </div>
              )}

              {overlapReports.length > 0 && (
                <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-lg space-y-2 text-xs text-amber-200">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      Detected {overlapReports.length} Overlapping Cue(s)
                    </span>
                    <button
                      onClick={handleAutoFixOverlaps}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-semibold transition-colors"
                    >
                      Auto-fix Overlaps
                    </button>
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-1 text-[11px] font-mono scrollbar-thin">
                    {overlapReports.map((rep, i) => (
                      <div key={i}>
                        Cue #{rep.index1} ends at {rep.cue1.end.toFixed(2)}s but Cue #{rep.index2} starts at {rep.cue2.start.toFixed(2)}s
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importedCues && (
                <div className="p-3 bg-zinc-950 border border-white/5 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 truncate max-w-[200px]">File: {importFileName}</span>
                    <span className="text-emerald-400 font-semibold">{importedCues.length} Cues Parsed</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1 pr-1 text-[11px] text-zinc-300 font-mono scrollbar-thin">
                    {importedCues.slice(0, 5).map((cue, idx) => (
                      <div key={idx} className="truncate border-b border-white/5 pb-0.5">
                        [{cue.start.toFixed(1)}s - {cue.end.toFixed(1)}s] {cue.text}
                      </div>
                    ))}
                    {importedCues.length > 5 && (
                      <div className="text-zinc-500 italic">...and {importedCues.length - 5} more cues</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
              <button onClick={closeImportModal} className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white rounded-lg">
                Cancel
              </button>
              <button
                disabled={!importedCues || importedCues.length === 0 || overlapReports.length > 0}
                onClick={confirmImport}
                className="px-4 py-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Confirm & Replace Captions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CUSTOM DICTIONARY MODAL ─────────────────────────────────────────── */}
      {showDictModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={closeDictModal}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-xl bg-zinc-900 border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Custom Spelling Dictionary</h3>
              </div>
              <button onClick={closeDictModal} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Save reusable spelling rules for creator names, brand names, or English words spoken inside Indian language sentences.
            </p>

            {!activeUserId && (
              <div className="p-3 bg-amber-950/60 border border-amber-500/30 rounded-lg text-xs text-amber-300">
                Sign in required to access custom dictionary. User ID is missing.
              </div>
            )}

            {/* Add Rule Inputs */}
            {activeUserId && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Spoken error (e.g. hyd)"
                  value={newSearch}
                  onChange={(e) => setNewSearch(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                />
                <span className="text-zinc-500 text-xs">→</span>
                <input
                  type="text"
                  placeholder="Correction (e.g. Hyderabad)"
                  value={newReplace}
                  onChange={(e) => setNewReplace(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                />
                <button
                  onClick={handleAddDictRule}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors"
                >
                  Add Rule
                </button>
              </div>
            )}

            {dictError && (
              <div className="flex items-center gap-2 p-2 bg-rose-950/60 border border-rose-500/30 rounded-lg text-xs text-rose-300">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                <span>{dictError}</span>
              </div>
            )}

            {dictSuccess && (
              <div className="flex items-center gap-2 p-2 bg-emerald-950/60 border border-emerald-500/30 rounded-lg text-xs text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span>{dictSuccess}</span>
              </div>
            )}

            {/* List Existing Rules */}
            {activeUserId && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400 border-b border-white/5 pb-1">
                  <span>Saved Rules ({dictRules.length})</span>
                  {dictRules.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApplyRules(dictRules, false)}
                        className="text-violet-400 hover:text-violet-300 font-semibold"
                      >
                        Apply Once
                      </button>
                      <span className="text-zinc-600">|</span>
                      <button
                        onClick={() => handleApplyRules(dictRules, true)}
                        className="text-emerald-400 hover:text-emerald-300 font-semibold"
                      >
                        Apply All Rules
                      </button>
                    </div>
                  )}
                </div>

                {dictRules.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-500 bg-zinc-950 rounded-lg border border-white/5">
                    No dictionary rules saved yet. Add your first rule above.
                  </div>
                ) : (
                  <div className="max-h-52 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                    {dictRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="p-2.5 bg-zinc-950 border border-white/5 rounded-lg text-xs space-y-2"
                      >
                        {editingRuleId === rule.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editSearch}
                              onChange={(e) => setEditSearch(e.target.value)}
                              className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs text-white"
                            />
                            <span className="text-zinc-500">→</span>
                            <input
                              type="text"
                              value={editReplace}
                              onChange={(e) => setEditReplace(e.target.value)}
                              className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs text-white"
                            />
                            <button
                              onClick={handleSaveEditRule}
                              className="px-2 py-1 bg-emerald-600 text-white rounded text-[11px] font-semibold"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingRuleId(null)}
                              className="px-2 py-1 bg-zinc-800 text-zinc-400 hover:text-white rounded text-[11px]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : deleteConfirmId === rule.id ? (
                          <div className="flex items-center justify-between text-rose-300 bg-rose-950/40 p-1.5 rounded border border-rose-500/20">
                            <span>Confirm deletion of rule &ldquo;{rule.search}&rdquo;?</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDeleteRule(rule.id)}
                                className="px-2 py-0.5 bg-rose-600 text-white font-semibold rounded text-[10px]"
                              >
                                Confirm Delete
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="text-zinc-400 hover:text-white text-[10px]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-semibold text-amber-300">{rule.search}</span>
                              <span className="text-zinc-500">→</span>
                              <span className="text-emerald-300 font-semibold">{rule.replaceWith}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleApplyRules([rule], false)}
                                className="px-2 py-0.5 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 text-[10px] font-medium rounded"
                              >
                                Apply Once
                              </button>
                              <button
                                onClick={() => handleApplyRules([rule], true)}
                                className="px-2 py-0.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-[10px] font-medium rounded"
                              >
                                Apply All
                              </button>
                              <button
                                onClick={() => startEditRule(rule)}
                                className="p-1 text-zinc-400 hover:text-white"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(rule.id)}
                                className="p-1 text-zinc-400 hover:text-rose-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-white/5">
              <button onClick={closeDictModal} className="px-4 py-1.5 text-xs text-zinc-400 hover:text-white rounded-lg">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
