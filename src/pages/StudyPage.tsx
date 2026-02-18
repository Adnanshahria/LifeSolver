import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus, GraduationCap, Trash2, Search, BookOpen, TrendingUp,
    Award, Brain, ChevronRight, Pencil, Check, X,
    Clock, Calendar, BookMarked, Layers, FolderPlus, FilePlus
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { SEO } from "@/components/seo/SEO";
import { StudyAnalytics } from "@/components/study/StudyAnalytics";
import { useStudy, StudySubject, StudyChapter, StudyPart } from "@/hooks/useStudy";
import { useToast } from "@/hooks/use-toast";
import { useAI } from "@/contexts/AIContext";

// ─── Color Palette for subjects ──────────────────────────────────────
const SUBJECT_COLORS = [
    { bg: "from-violet-500/20 to-purple-500/10", border: "border-violet-500/30", text: "text-violet-500 dark:text-violet-400", accent: "#8b5cf6", progressBg: "bg-violet-500" },
    { bg: "from-cyan-500/20 to-teal-500/10", border: "border-cyan-500/30", text: "text-cyan-600 dark:text-cyan-400", accent: "#06b6d4", progressBg: "bg-cyan-500" },
    { bg: "from-emerald-500/20 to-green-500/10", border: "border-emerald-500/30", text: "text-emerald-600 dark:text-emerald-400", accent: "#10b981", progressBg: "bg-emerald-500" },
    { bg: "from-rose-500/20 to-pink-500/10", border: "border-rose-500/30", text: "text-rose-600 dark:text-rose-400", accent: "#f43f5e", progressBg: "bg-rose-500" },
    { bg: "from-amber-500/20 to-yellow-500/10", border: "border-amber-500/30", text: "text-amber-600 dark:text-amber-400", accent: "#f59e0b", progressBg: "bg-amber-500" },
    { bg: "from-indigo-500/20 to-blue-500/10", border: "border-indigo-500/30", text: "text-indigo-600 dark:text-indigo-400", accent: "#6366f1", progressBg: "bg-indigo-500" },
    { bg: "from-orange-500/20 to-red-500/10", border: "border-orange-500/30", text: "text-orange-600 dark:text-orange-400", accent: "#f97316", progressBg: "bg-orange-500" },
];

const getColor = (i: number) => SUBJECT_COLORS[i % SUBJECT_COLORS.length];

// ─── Status helpers ──────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; color: string; bg: string; next: string }> = {
    "not-started": { label: "Todo", color: "text-muted-foreground", bg: "bg-secondary/60", next: "in-progress" },
    "in-progress": { label: "Active", color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-500/15", next: "completed" },
    "completed": { label: "Done", color: "text-green-500 dark:text-green-400", bg: "bg-green-500/15", next: "not-started" },
};

// ─── Time options ────────────────────────────────────────────────────
const TIME_OPTIONS = [15, 30, 45, 60, 90, 120, 180];

// ══════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════

export default function StudyPage() {
    const study = useStudy();
    const { toast } = useToast();
    const { setPageContext } = useAI();

    // ── Local UI state ───────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
    const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
    const [filterSubject, setFilterSubject] = useState<string>("all");

    // Dialog states
    const [addSubjectOpen, setAddSubjectOpen] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState("");

    const [addChapterOpen, setAddChapterOpen] = useState(false);
    const [addChapterSubjectId, setAddChapterSubjectId] = useState("");
    const [newChapterName, setNewChapterName] = useState("");

    const [addPartOpen, setAddPartOpen] = useState(false);
    const [addPartChapterId, setAddPartChapterId] = useState("");
    const [newPartName, setNewPartName] = useState("");
    const [newPartMinutes, setNewPartMinutes] = useState(30);
    const [newPartDate, setNewPartDate] = useState("");

    const [editSubjectOpen, setEditSubjectOpen] = useState(false);
    const [editSubjectId, setEditSubjectId] = useState("");
    const [editSubjectName, setEditSubjectName] = useState("");

    const [editChapterOpen, setEditChapterOpen] = useState(false);
    const [editChapterId, setEditChapterId] = useState("");
    const [editChapterName, setEditChapterName] = useState("");

    const [editPartOpen, setEditPartOpen] = useState(false);
    const [editPartId, setEditPartId] = useState("");
    const [editPartData, setEditPartData] = useState<{ name: string; minutes: number; date: string }>({ name: "", minutes: 30, date: "" });

    // Initially expand all subjects (once loaded)
    useEffect(() => {
        if (study.subjects.length > 0 && expandedSubjects.size === 0) {
            setExpandedSubjects(new Set(study.subjects.map(s => s.id)));
        }
    }, [study.subjects.length]);

    // AI page context
    useEffect(() => {
        setPageContext(`User is on Study Page. Subjects: ${study.subjects.length}, Chapters: ${study.chapters.length}, Parts: ${study.totalParts}, Completed: ${study.completedParts}, Progress: ${study.overallProgress}%. Subject names: ${study.subjects.map(s => s.name).join(", ") || "None"}.`);
    }, [study.subjects, study.chapters, study.totalParts, study.completedParts, study.overallProgress, setPageContext]);

    // ── Toggle helpers ───────────────────────────────────────────────
    const toggleSubject = (id: string) => {
        setExpandedSubjects(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleChapter = (id: string) => {
        setExpandedChapters(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    // ── Search / filter ──────────────────────────────────────────────
    const filteredSubjects = useMemo(() => {
        let list = study.subjects;
        if (filterSubject !== "all") list = list.filter(s => s.id === filterSubject);
        if (!searchTerm) return list;
        const q = searchTerm.toLowerCase();
        return list.filter(s => {
            if (s.name.toLowerCase().includes(q)) return true;
            const chs = study.chaptersBySubject[s.id] || [];
            return chs.some(c => {
                if (c.name.toLowerCase().includes(q)) return true;
                const pts = study.partsByChapter[c.id] || [];
                return pts.some(p => p.name.toLowerCase().includes(q));
            });
        });
    }, [study.subjects, study.chaptersBySubject, study.partsByChapter, filterSubject, searchTerm]);

    // ── Handlers ─────────────────────────────────────────────────────
    const handleAddSubject = async () => {
        if (!newSubjectName.trim()) return;
        await study.addSubject.mutateAsync(newSubjectName.trim());
        setNewSubjectName("");
        setAddSubjectOpen(false);
        toast({ title: "📚 Subject created!" });
    };

    const handleAddChapter = async () => {
        if (!newChapterName.trim() || !addChapterSubjectId) return;
        await study.addChapter.mutateAsync({ subjectId: addChapterSubjectId, name: newChapterName.trim() });
        setNewChapterName("");
        setAddChapterOpen(false);
        setExpandedSubjects(p => new Set(p).add(addChapterSubjectId));
    };

    const handleAddPart = async () => {
        if (!newPartName.trim() || !addPartChapterId) return;
        await study.addPart.mutateAsync({
            chapterId: addPartChapterId,
            name: newPartName.trim(),
            estimatedMinutes: newPartMinutes,
            scheduledDate: newPartDate || undefined,
        });
        setNewPartName("");
        setNewPartMinutes(30);
        setNewPartDate("");
        setAddPartOpen(false);
        setExpandedChapters(p => new Set(p).add(addPartChapterId));
    };

    const handleSaveEditSubject = async () => {
        if (!editSubjectName.trim() || !editSubjectId) return;
        await study.renameSubject.mutateAsync({ id: editSubjectId, name: editSubjectName.trim() });
        setEditSubjectOpen(false);
    };

    const handleSaveEditChapter = async () => {
        if (!editChapterName.trim() || !editChapterId) return;
        await study.renameChapter.mutateAsync({ id: editChapterId, name: editChapterName.trim() });
        setEditChapterOpen(false);
    };

    const handleSaveEditPart = async () => {
        if (!editPartData.name.trim() || !editPartId) return;
        await study.updatePart.mutateAsync({
            id: editPartId,
            name: editPartData.name.trim(),
            estimated_minutes: editPartData.minutes,
            scheduled_date: editPartData.date || null,
        });
        setEditPartOpen(false);
    };

    // ── Open dialog helpers ──────────────────────────────────────────
    const openAddChapter = (subjectId: string) => {
        setAddChapterSubjectId(subjectId);
        setNewChapterName("");
        setAddChapterOpen(true);
    };

    const openAddPart = (chapterId: string) => {
        setAddPartChapterId(chapterId);
        setNewPartName("");
        setNewPartMinutes(30);
        setNewPartDate("");
        setAddPartOpen(true);
    };

    const openEditSubject = (subject: StudySubject) => {
        setEditSubjectId(subject.id);
        setEditSubjectName(subject.name);
        setEditSubjectOpen(true);
    };

    const openEditChapter = (chapter: StudyChapter) => {
        setEditChapterId(chapter.id);
        setEditChapterName(chapter.name);
        setEditChapterOpen(true);
    };

    const openEditPart = (part: StudyPart) => {
        setEditPartId(part.id);
        setEditPartData({
            name: part.name,
            minutes: part.estimated_minutes,
            date: part.scheduled_date || "",
        });
        setEditPartOpen(true);
    };

    // ══════════════════════════════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════════════════════════════

    return (
        <AppLayout>
            <SEO title="Study Tracker" description="Track your academic progress across subjects, chapters, and parts." />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 sm:space-y-6">

                {/* ═══ HEADER & TOOLBAR ═══ */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div className="hidden md:block">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                                <GraduationCap className="w-6 h-6 text-primary" />
                            </div>
                            <h1 className="text-3xl font-bold font-display tracking-tight">Study</h1>
                        </div>
                        <p className="text-sm text-muted-foreground ml-14">Organize subjects, chapters & parts</p>
                    </div>

                    <div className="top-toolbar w-full sm:w-auto">
                        {/* Subject filter dropdown */}
                        <div className="relative">
                            <select
                                className="h-9 w-full sm:w-[140px] appearance-none rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                value={filterSubject}
                                onChange={(e) => setFilterSubject(e.target.value)}
                            >
                                <option value="all">All Subjects</option>
                                {study.subjects.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rotate-90 opacity-50 pointer-events-none" />
                        </div>

                        {/* Search */}
                        <div className="relative flex-1 min-w-[120px] max-w-[240px]">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 h-8 text-xs sm:text-sm"
                            />
                        </div>

                        {/* Add Subject button */}
                        <Button size="icon" className="h-8 w-8 sm:w-auto sm:px-3 sm:gap-1.5 shadow-lg shadow-primary/20" onClick={() => setAddSubjectOpen(true)}>
                            <Plus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Subject</span>
                        </Button>
                    </div>
                </div>

                {/* ═══ STATS ROW ═══ */}
                <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
                    {[
                        { icon: BookOpen, label: "Subjects", value: study.subjects.length, color: "text-violet-500 dark:text-violet-400", bg: "from-violet-500/15 to-violet-500/5" },
                        { icon: Layers, label: "Chapters", value: study.chapters.length, color: "text-cyan-500 dark:text-cyan-400", bg: "from-cyan-500/15 to-cyan-500/5" },
                        { icon: Award, label: "Parts Done", value: `${study.completedParts}/${study.totalParts}`, color: "text-green-500 dark:text-green-400", bg: "from-green-500/15 to-green-500/5" },
                        { icon: Brain, label: "Progress", value: `${study.overallProgress}%`, color: "text-primary", bg: "from-primary/15 to-primary/5" },
                    ].map(stat => (
                        <div key={stat.label} className={`glass-card p-2 sm:p-3 bg-gradient-to-br ${stat.bg} border border-white/5`}>
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className={`p-1.5 sm:p-2 rounded-lg bg-background/50 ${stat.color}`}>
                                    <stat.icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm sm:text-lg font-bold">{stat.value}</p>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{stat.label}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ═══ ANALYTICS ═══ */}
                <StudyAnalytics subjects={study.subjects} chapters={study.chapters} parts={study.parts} chaptersBySubject={study.chaptersBySubject} partsByChapter={study.partsByChapter} subjectProgress={study.subjectProgress} />

                {/* ═══ SUBJECT TREE ═══ */}
                <div className="space-y-3">
                    {study.isLoading ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <div className="animate-pulse flex flex-col items-center gap-3">
                                <Brain className="w-10 h-10 opacity-50" />
                                <span>Loading your study data...</span>
                            </div>
                        </div>
                    ) : filteredSubjects.length === 0 ? (
                        /* ── Empty State ── */
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                            <div className="flex flex-col items-center gap-4">
                                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                                    <GraduationCap className="w-12 h-12 text-primary opacity-60" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold mb-1">
                                        {searchTerm ? "No results match your search" : "Start Your Learning Journey"}
                                    </h3>
                                    <p className="text-muted-foreground text-sm">
                                        {searchTerm ? "Try a different search term" : "Create your first subject to start organizing your study plan!"}
                                    </p>
                                </div>
                                {!searchTerm && (
                                    <Button onClick={() => setAddSubjectOpen(true)} className="gap-2 mt-2">
                                        <Plus className="w-4 h-4" /> Create First Subject
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        filteredSubjects.map((subject, si) => {
                            const color = getColor(subject.color_index ?? si);
                            const isExpanded = expandedSubjects.has(subject.id);
                            const progress = study.subjectProgress[subject.id] || 0;
                            const subChapters = study.chaptersBySubject[subject.id] || [];
                            const totalSubParts = subChapters.flatMap(c => study.partsByChapter[c.id] || []);

                            return (
                                <motion.div
                                    key={subject.id}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: si * 0.06 }}
                                    className={`glass-card overflow-hidden border ${color.border}`}
                                >
                                    {/* ── Subject Header ── */}
                                    <div
                                        className={`p-3 sm:p-4 bg-gradient-to-r ${color.bg} cursor-pointer select-none`}
                                        onClick={() => toggleSubject(subject.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                                <motion.div
                                                    animate={{ rotate: isExpanded ? 90 : 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="flex-shrink-0"
                                                >
                                                    <ChevronRight className={`w-4 h-4 sm:w-5 sm:h-5 ${color.text}`} />
                                                </motion.div>

                                                <div className="p-1.5 sm:p-2 rounded-xl bg-background/50 flex-shrink-0">
                                                    <BookMarked className={`w-4 h-4 sm:w-5 sm:h-5 ${color.text}`} />
                                                </div>

                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-sm sm:text-lg truncate">{subject.name}</h3>
                                                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                                                        {subChapters.length} chapter{subChapters.length !== 1 ? "s" : ""} · {totalSubParts.length} part{totalSubParts.length !== 1 ? "s" : ""}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                                {/* Progress pill */}
                                                <div className={`text-xs sm:text-sm font-bold px-2.5 py-1 rounded-full ${progress >= 100 ? "bg-green-500/20 text-green-500 dark:text-green-400" :
                                                    progress > 50 ? "bg-blue-500/20 text-blue-500 dark:text-blue-400" :
                                                        progress > 0 ? "bg-amber-500/20 text-amber-500 dark:text-amber-400" :
                                                            "bg-secondary/50 text-muted-foreground"
                                                    }`}>
                                                    {progress}%
                                                </div>

                                                {/* Add chapter */}
                                                <Button
                                                    size="icon" variant="ghost"
                                                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                                                    title="Add chapter"
                                                    onClick={() => openAddChapter(subject.id)}
                                                >
                                                    <FolderPlus className="w-3.5 h-3.5" />
                                                </Button>

                                                {/* Edit subject */}
                                                <Button
                                                    size="icon" variant="ghost"
                                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                    onClick={() => openEditSubject(subject)}
                                                >
                                                    <Pencil className="w-3 h-3" />
                                                </Button>

                                                {/* Delete subject */}
                                                <Button
                                                    size="icon" variant="ghost"
                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                    onClick={() => study.deleteSubject.mutate(subject.id)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Subject progress bar */}
                                        <div className="mt-2 h-1.5 rounded-full bg-background/30 overflow-hidden">
                                            <motion.div
                                                className={`h-full rounded-full ${color.progressBg}`}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progress}%` }}
                                                transition={{ duration: 0.6, ease: "easeOut" }}
                                            />
                                        </div>
                                    </div>

                                    {/* ── Chapters ── */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.25 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="p-2 sm:p-3 space-y-1.5">
                                                    {subChapters.length === 0 ? (
                                                        <div className="text-center py-4 text-muted-foreground text-xs sm:text-sm">
                                                            No chapters yet.{" "}
                                                            <button
                                                                className="text-primary hover:underline"
                                                                onClick={() => openAddChapter(subject.id)}
                                                            >
                                                                Add one
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        subChapters.map((chapter, ci) => {
                                                            const chProgress = study.chapterProgress[chapter.id] || 0;
                                                            const isChExpanded = expandedChapters.has(chapter.id);
                                                            const chParts = study.partsByChapter[chapter.id] || [];

                                                            return (
                                                                <motion.div
                                                                    key={chapter.id}
                                                                    initial={{ opacity: 0, x: -8 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    transition={{ delay: ci * 0.03 }}
                                                                    className="rounded-xl border bg-card/50 hover:bg-card/80 transition-colors overflow-hidden"
                                                                >
                                                                    {/* Chapter Row */}
                                                                    <div
                                                                        className="flex items-center gap-2 p-2.5 sm:p-3 cursor-pointer select-none"
                                                                        onClick={() => toggleChapter(chapter.id)}
                                                                    >
                                                                        <motion.div
                                                                            animate={{ rotate: isChExpanded ? 90 : 0 }}
                                                                            transition={{ duration: 0.2 }}
                                                                        >
                                                                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                                                                        </motion.div>

                                                                        <span className="font-medium text-xs sm:text-sm flex-1 truncate">{chapter.name}</span>

                                                                        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                                                            {/* Chapter progress */}
                                                                            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 font-mono ${chProgress >= 100 ? "bg-green-500/15 text-green-500 dark:text-green-400" :
                                                                                chProgress > 0 ? "bg-blue-500/15 text-blue-500 dark:text-blue-400" :
                                                                                    ""
                                                                                }`}>
                                                                                {chProgress}%
                                                                            </Badge>
                                                                            <span className="text-[10px] text-muted-foreground ml-1">{chParts.length}p</span>

                                                                            {/* Add part */}
                                                                            <Button
                                                                                size="icon" variant="ghost"
                                                                                className="h-6 w-6 text-muted-foreground hover:text-primary"
                                                                                title="Add part"
                                                                                onClick={() => openAddPart(chapter.id)}
                                                                            >
                                                                                <FilePlus className="w-3 h-3" />
                                                                            </Button>

                                                                            {/* Edit chapter */}
                                                                            <Button
                                                                                size="icon" variant="ghost"
                                                                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                                                onClick={() => openEditChapter(chapter)}
                                                                            >
                                                                                <Pencil className="w-2.5 h-2.5" />
                                                                            </Button>

                                                                            {/* Delete chapter */}
                                                                            <Button
                                                                                size="icon" variant="ghost"
                                                                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                                                onClick={() => study.deleteChapter.mutate(chapter.id)}
                                                                            >
                                                                                <Trash2 className="w-3 h-3" />
                                                                            </Button>
                                                                        </div>
                                                                    </div>

                                                                    {/* Parts list */}
                                                                    <AnimatePresence>
                                                                        {isChExpanded && chParts.length > 0 && (
                                                                            <motion.div
                                                                                initial={{ height: 0, opacity: 0 }}
                                                                                animate={{ height: "auto", opacity: 1 }}
                                                                                exit={{ height: 0, opacity: 0 }}
                                                                                transition={{ duration: 0.2 }}
                                                                                className="overflow-hidden"
                                                                            >
                                                                                <div className="border-t border-border/30 divide-y divide-border/20">
                                                                                    {chParts.map((part) => (
                                                                                        <PartRow
                                                                                            key={part.id}
                                                                                            part={part}
                                                                                            onStartEdit={() => openEditPart(part)}
                                                                                            onToggleStatus={() => study.togglePartStatus.mutate({ id: part.id, currentStatus: part.status })}
                                                                                            onDelete={() => study.deletePart.mutate(part.id)}
                                                                                        />
                                                                                    ))}
                                                                                </div>
                                                                            </motion.div>
                                                                        )}
                                                                    </AnimatePresence>

                                                                    {/* Chapter progress bar (thin) */}
                                                                    <div className="h-1 bg-secondary/30">
                                                                        <motion.div
                                                                            className={`h-full ${color.progressBg} opacity-60`}
                                                                            initial={{ width: 0 }}
                                                                            animate={{ width: `${chProgress}%` }}
                                                                            transition={{ duration: 0.5 }}
                                                                        />
                                                                    </div>
                                                                </motion.div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })
                    )}
                </div>
            </motion.div>

            {/* ══════════════════════════════════════════════════════════
                POPUP DIALOGS
            ══════════════════════════════════════════════════════════ */}

            {/* ── Add Subject Dialog ─────────────────────────────────── */}
            <Dialog open={addSubjectOpen} onOpenChange={setAddSubjectOpen}>
                <DialogContent className="w-[95vw] max-w-md rounded-2xl sm:rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Add New Subject</DialogTitle>
                        <DialogDescription>Create a new subject to organize your study materials.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <Input
                            placeholder="Subject name (e.g., Physics, Calculus)"
                            value={newSubjectName}
                            onChange={(e) => setNewSubjectName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddSubject()}
                            autoFocus
                        />
                        <Button onClick={handleAddSubject} className="w-full" disabled={study.addSubject.isPending}>
                            {study.addSubject.isPending ? "Creating..." : "Create Subject"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Add Chapter Dialog ──────────────────────────────────── */}
            <Dialog open={addChapterOpen} onOpenChange={setAddChapterOpen}>
                <DialogContent className="w-[95vw] max-w-md rounded-2xl sm:rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Add Chapter</DialogTitle>
                        <DialogDescription>
                            Add a new chapter to {study.subjects.find(s => s.id === addChapterSubjectId)?.name || "this subject"}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <Input
                            placeholder="Chapter name..."
                            value={newChapterName}
                            onChange={e => setNewChapterName(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleAddChapter()}
                            autoFocus
                        />
                        <Button onClick={handleAddChapter} className="w-full" disabled={study.addChapter.isPending}>
                            {study.addChapter.isPending ? "Adding..." : "Add Chapter"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Add Part Dialog ─────────────────────────────────────── */}
            <Dialog open={addPartOpen} onOpenChange={setAddPartOpen}>
                <DialogContent className="w-[95vw] max-w-md rounded-2xl sm:rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Add Part</DialogTitle>
                        <DialogDescription>
                            Add a learning part to {study.chapters.find(c => c.id === addPartChapterId)?.name || "this chapter"}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <Input
                            placeholder="Part name..."
                            value={newPartName}
                            onChange={e => setNewPartName(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleAddPart()}
                            autoFocus
                        />
                        <div className="grid grid-cols-2 gap-3">
                            {/* Duration */}
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Duration
                                </label>
                                <Select
                                    value={String(newPartMinutes)}
                                    onValueChange={(v) => setNewPartMinutes(Number(v))}
                                >
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Duration" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TIME_OPTIONS.map(t => (
                                            <SelectItem key={t} value={String(t)}>
                                                {t >= 60 ? `${t / 60}h` : `${t}m`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Date */}
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Date
                                </label>
                                <DatePicker
                                    value={newPartDate}
                                    onChange={(date) => setNewPartDate(date || "")}
                                    className="h-9"
                                    placeholder="Pick a date"
                                />
                            </div>
                        </div>
                        <Button onClick={handleAddPart} className="w-full" disabled={study.addPart.isPending}>
                            {study.addPart.isPending ? "Adding..." : "Add Part"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Edit Subject Dialog ─────────────────────────────────── */}
            <Dialog open={editSubjectOpen} onOpenChange={setEditSubjectOpen}>
                <DialogContent className="w-[95vw] max-w-md rounded-2xl sm:rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Edit Subject</DialogTitle>
                        <DialogDescription>Rename this subject.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <Input
                            value={editSubjectName}
                            onChange={e => setEditSubjectName(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleSaveEditSubject()}
                            autoFocus
                        />
                        <Button onClick={handleSaveEditSubject} className="w-full" disabled={study.renameSubject.isPending}>
                            {study.renameSubject.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Edit Chapter Dialog ─────────────────────────────────── */}
            <Dialog open={editChapterOpen} onOpenChange={setEditChapterOpen}>
                <DialogContent className="w-[95vw] max-w-md rounded-2xl sm:rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Edit Chapter</DialogTitle>
                        <DialogDescription>Rename this chapter.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <Input
                            value={editChapterName}
                            onChange={e => setEditChapterName(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleSaveEditChapter()}
                            autoFocus
                        />
                        <Button onClick={handleSaveEditChapter} className="w-full" disabled={study.renameChapter.isPending}>
                            {study.renameChapter.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Edit Part Dialog ────────────────────────────────────── */}
            <Dialog open={editPartOpen} onOpenChange={setEditPartOpen}>
                <DialogContent className="w-[95vw] max-w-md rounded-2xl sm:rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Edit Part</DialogTitle>
                        <DialogDescription>Update part details.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <Input
                            placeholder="Part name"
                            value={editPartData.name}
                            onChange={e => setEditPartData({ ...editPartData, name: e.target.value })}
                            onKeyDown={e => e.key === "Enter" && handleSaveEditPart()}
                            autoFocus
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Duration
                                </label>
                                <Select
                                    value={String(editPartData.minutes)}
                                    onValueChange={(v) => setEditPartData({ ...editPartData, minutes: Number(v) })}
                                >
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Duration" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TIME_OPTIONS.map(t => (
                                            <SelectItem key={t} value={String(t)}>
                                                {t >= 60 ? `${t / 60}h` : `${t}m`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Date
                                </label>
                                <DatePicker
                                    value={editPartData.date}
                                    onChange={(date) => setEditPartData({ ...editPartData, date: date || "" })}
                                    className="h-9"
                                    placeholder="Pick a date"
                                />
                            </div>
                        </div>
                        <Button onClick={handleSaveEditPart} className="w-full" disabled={study.updatePart.isPending}>
                            {study.updatePart.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

// ══════════════════════════════════════════════════════════════════════
// PART ROW COMPONENT (simplified — no inline editing)
// ══════════════════════════════════════════════════════════════════════

function PartRow({
    part,
    onStartEdit,
    onToggleStatus,
    onDelete,
}: {
    part: StudyPart;
    onStartEdit: () => void;
    onToggleStatus: () => void;
    onDelete: () => void;
}) {
    const status = STATUS_MAP[part.status] || STATUS_MAP["not-started"];

    return (
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 hover:bg-secondary/20 transition-colors group">
            {/* Status toggle */}
            <button
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${part.status === "completed" ? "border-green-500 bg-green-500/20" :
                    part.status === "in-progress" ? "border-blue-500 bg-blue-500/20" :
                        "border-muted-foreground/30 hover:border-muted-foreground/60"
                    }`}
                onClick={onToggleStatus}
                title={`Status: ${status.label} → Click to change`}
            >
                {part.status === "completed" && <Check className="w-3 h-3 text-green-500 dark:text-green-400" />}
                {part.status === "in-progress" && <div className="w-2 h-2 rounded-sm bg-blue-500" />}
            </button>

            {/* Part name */}
            <span className={`text-xs sm:text-sm flex-1 truncate ${part.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                {part.name}
            </span>

            {/* Meta badges */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Duration badge */}
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 font-normal">
                    <Clock className="w-2.5 h-2.5" />
                    {part.estimated_minutes >= 60 ? `${part.estimated_minutes / 60}h` : `${part.estimated_minutes}m`}
                </Badge>

                {/* Date badge */}
                {part.scheduled_date && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 font-normal">
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(part.scheduled_date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </Badge>
                )}

                {/* Time badge */}
                {part.scheduled_time && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                        {part.scheduled_time}
                    </Badge>
                )}

                {/* Status badge */}
                <Badge className={`text-[10px] px-1.5 py-0 ${status.bg} ${status.color} border-0`}>
                    {status.label}
                </Badge>
            </div>

            {/* Actions (visible on hover) */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={onStartEdit}>
                    <Pencil className="w-2.5 h-2.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={onDelete}>
                    <Trash2 className="w-3 h-3" />
                </Button>
            </div>
        </div>
    );
}
