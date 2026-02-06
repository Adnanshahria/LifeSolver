import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, FileText, Trash2, Tag, Search } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useNotes, Note } from "@/hooks/useNotes";

export default function NotesPage() {
    const { notes, isLoading, addNote, updateNote, deleteNote } = useNotes();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [newNote, setNewNote] = useState({
        title: "",
        content: "",
        tags: "",
    });

    const handleAddNote = async () => {
        if (!newNote.title.trim()) return;
        await addNote.mutateAsync(newNote);
        setNewNote({ title: "", content: "", tags: "" });
        setIsDialogOpen(false);
    };

    const handleUpdateNote = async () => {
        if (!selectedNote) return;
        await updateNote.mutateAsync(selectedNote);
        setSelectedNote(null);
    };

    const filteredNotes = notes.filter((note) => {
        const query = searchQuery.toLowerCase();
        return (
            note.title.toLowerCase().includes(query) ||
            note.content?.toLowerCase().includes(query) ||
            note.tags?.toLowerCase().includes(query)
        );
    });

    return (
        <AppLayout>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
            >
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Notes</h1>
                        <p className="text-muted-foreground">Capture your thoughts and ideas</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search notes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 w-64"
                            />
                        </div>
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    New Note
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Create New Note</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                    <Input
                                        placeholder="Note title..."
                                        value={newNote.title}
                                        onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                                    />
                                    <Textarea
                                        placeholder="Write your note here... (Markdown supported)"
                                        value={newNote.content}
                                        onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                                        className="min-h-[200px]"
                                    />
                                    <Input
                                        placeholder="Tags (comma separated)"
                                        value={newNote.tags}
                                        onChange={(e) => setNewNote({ ...newNote, tags: e.target.value })}
                                    />
                                    <Button onClick={handleAddNote} className="w-full" disabled={addNote.isPending}>
                                        {addNote.isPending ? "Creating..." : "Create Note"}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Notes Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoading ? (
                        <div className="col-span-full text-center py-8 text-muted-foreground">
                            Loading notes...
                        </div>
                    ) : filteredNotes.length === 0 ? (
                        <div className="col-span-full text-center py-8 text-muted-foreground">
                            {searchQuery ? "No notes match your search" : "No notes yet. Create your first note!"}
                        </div>
                    ) : (
                        filteredNotes.map((note, index) => (
                            <motion.div
                                key={note.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                className="glass-card p-4 cursor-pointer hover:border-primary/50 transition-colors group"
                                onClick={() => setSelectedNote(note)}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-primary" />
                                        <h3 className="font-semibold truncate">{note.title}</h3>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteNote.mutate(note.id);
                                        }}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                                    {note.content || "No content"}
                                </p>
                                {note.tags && (
                                    <div className="flex flex-wrap gap-1">
                                        {note.tags.split(",").map((tag, i) => (
                                            <Badge key={i} variant="secondary" className="text-xs">
                                                <Tag className="w-2 h-2 mr-1" />
                                                {tag.trim()}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                    {new Date(note.created_at).toLocaleDateString()}
                                </p>
                            </motion.div>
                        ))
                    )}
                </div>

                {/* Edit Note Dialog */}
                <Dialog open={!!selectedNote} onOpenChange={(open) => !open && setSelectedNote(null)}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Edit Note</DialogTitle>
                        </DialogHeader>
                        {selectedNote && (
                            <div className="space-y-4 pt-4">
                                <Input
                                    placeholder="Note title..."
                                    value={selectedNote.title}
                                    onChange={(e) => setSelectedNote({ ...selectedNote, title: e.target.value })}
                                />
                                <Textarea
                                    placeholder="Write your note here... (Markdown supported)"
                                    value={selectedNote.content || ""}
                                    onChange={(e) => setSelectedNote({ ...selectedNote, content: e.target.value })}
                                    className="min-h-[200px]"
                                />
                                <Input
                                    placeholder="Tags (comma separated)"
                                    value={selectedNote.tags || ""}
                                    onChange={(e) => setSelectedNote({ ...selectedNote, tags: e.target.value })}
                                />
                                <Button onClick={handleUpdateNote} className="w-full" disabled={updateNote.isPending}>
                                    {updateNote.isPending ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </motion.div>
        </AppLayout>
    );
}
