import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import EditIcon from "@mui/icons-material/Edit";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SaveIcon from "@mui/icons-material/Save";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  addEntry,
  clearVocabulary,
  deleteEntry,
  getVocabulary,
  renameEntry,
} from "@tyvox/sdk/client";
import { logger } from "../../../utils/logger";

interface VocabularyEntry {
  entry: string;
  freq: number;
}

export const VocabularyTab = () => {
  const { t } = useTranslation();
  const [vocabulary, setVocabulary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editEntryValue, setEditEntryValue] = useState("");
  const [newEntryInput, setNewEntryInput] = useState("");

  const load = useCallback(async () => {
    const response = await getVocabulary();
    setVocabulary(response.data.vocabulary);
  }, []);

  useEffect(() => {
    load().catch((error) => {
      logger.error("Failed to load vocabulary", { error: String(error) });
    });
  }, [load]);

  const entries: VocabularyEntry[] = Object.entries(vocabulary)
    .filter(([, freq]) => freq > 0)
    .map(([entry, freq]) => ({ entry, freq }))
    .toSorted((a, b) => b.freq - a.freq);

  const handleAddEntry = async () => {
    const entry = newEntryInput.trim();
    if (!entry) return;
    setLoading(true);
    try {
      await addEntry(entry);
      setNewEntryInput("");
      setAddDialogOpen(false);
      await load();
    } catch (error) {
      logger.error("Failed to add vocabulary entry", { entry, error: String(error) });
    }
    setLoading(false);
  };

  const handleRenameEntry = async (oldEntry: string) => {
    const newEntry = editEntryValue.trim();
    if (!newEntry || newEntry === oldEntry) {
      setEditingEntry(null);
      return;
    }
    setLoading(true);
    try {
      await renameEntry(oldEntry, { newEntry });
      await load();
    } catch (error) {
      logger.error("Failed to rename vocabulary entry", { oldEntry, error: String(error) });
    }
    setLoading(false);
    setEditingEntry(null);
  };

  const handleDeleteEntry = async (entry: string) => {
    if (!window.confirm(t("vocabulary.confirmDelete", { vocabulary: entry }))) return;
    setLoading(true);
    try {
      await deleteEntry(entry);
      await load();
    } catch (error) {
      logger.error("Failed to delete vocabulary entry", { entry, error: String(error) });
    }
    setLoading(false);
  };

  const handleClearVocabulary = async () => {
    if (!window.confirm(t("vocabulary.confirmClear"))) return;
    setLoading(true);
    try {
      await clearVocabulary();
      await load();
    } catch (error) {
      logger.error("Failed to clear vocabulary", { error: String(error) });
    }
    setLoading(false);
  };

  return (
    <Stack spacing={3}>
      <Card variant="outlined" sx={{ backgroundColor: "background.paper" }}>
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2, py: 2, px: 2.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600 }}>
              {t("vocabulary.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t("vocabulary.hint")}
            </Typography>
          </Box>

          <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end" }}>
            <IconButton
              size="small"
              color="primary"
              onClick={() => setAddDialogOpen(true)}
              disabled={loading}
              aria-label={t("vocabulary.add")}
            >
              <AddIcon />
            </IconButton>
            {entries.length > 0 && (
              <IconButton
                size="small"
                color="error"
                onClick={handleClearVocabulary}
                disabled={loading}
                aria-label={t("vocabulary.clearAll")}
              >
                <DeleteSweepIcon />
              </IconButton>
            )}
          </Stack>

          {entries.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <MenuBookIcon sx={{ fontSize: 40, color: "text.secondary", mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {t("vocabulary.empty")}
              </Typography>
            </Box>
          ) : (
            <List dense disablePadding>
              {entries.map(({ entry }) => (
                <ListItem
                  key={entry}
                  divider
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 1.5,
                    py: 0.5,
                    px: 0,
                    alignItems: "center",
                  }}
                >
                  {editingEntry === entry ? (
                    <TextField
                      size="small"
                      value={editEntryValue}
                      onChange={(e) => setEditEntryValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleRenameEntry(entry);
                        if (e.key === "Escape") setEditingEntry(null);
                      }}
                      autoFocus
                      disabled={loading}
                    />
                  ) : (
                    <Typography
                      variant="body2"
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {entry}
                    </Typography>
                  )}
                  <Stack direction="row" spacing={0.5}>
                    {editingEntry === entry ? (
                      <IconButton
                        size="small"
                        onClick={() => handleRenameEntry(entry)}
                        disabled={loading}
                        aria-label={t("vocabulary.save")}
                      >
                        <SaveIcon fontSize="small" />
                      </IconButton>
                    ) : (
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingEntry(entry);
                          setEditEntryValue(entry);
                        }}
                        disabled={loading}
                        aria-label={t("vocabulary.edit")}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteEntry(entry)}
                      disabled={loading}
                      aria-label={t("vocabulary.delete")}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t("vocabulary.addEntry")}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            size="small"
            fullWidth
            label={t("vocabulary.properNouns")}
            value={newEntryInput}
            onChange={(e) => setNewEntryInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleAddEntry();
            }}
            disabled={loading}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)} disabled={loading}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handleAddEntry}
            disabled={loading || !newEntryInput.trim()}
          >
            {t("vocabulary.add")}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
