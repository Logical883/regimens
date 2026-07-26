import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useAuth } from "./AuthContext";

const STORAGE_KEY = "regimens_categories";

const DEFAULT_CATEGORIES = [
  {
    id: "cat-notebooks",
    name: "Notebooks",
    description: "Exercise books, notepads, and notebooks",
    keywords: "notebook,exercise book,note,notepad",
  },
  {
    id: "cat-pens",
    name: "Pens",
    description: "Ballpoint, gel, and fountain pens",
    keywords: "pen,biro,ballpoint",
  },
  {
    id: "cat-markers",
    name: "Markers",
    description: "Markers and highlighters",
    keywords: "marker,highlighter",
  },
  {
    id: "cat-files",
    name: "Files",
    description: "Folders, files, and filing supplies",
    keywords: "folder,file,manila",
  },
  {
    id: "cat-paper",
    name: "Paper",
    description: "Printing and writing paper",
    keywords: "paper,ream",
  },
  {
    id: "cat-fasteners",
    name: "Fasteners",
    description: "Staplers, clips, and fasteners",
    keywords: "stapler,staple,clip,pin,rubber band",
  },
  {
    id: "cat-correction",
    name: "Correction",
    description: "Correction fluid, tape, and erasers",
    keywords: "correction,tippex,eraser",
  },
  {
    id: "cat-cutting",
    name: "Cutting",
    description: "Scissors, cutters, and blades",
    keywords: "scissors,cutter,blade",
  },
  {
    id: "cat-cards",
    name: "Cards",
    description: "Index cards and greeting cards",
    keywords: "card,postcard",
  },
  {
    id: "cat-sets",
    name: "Sets",
    description: "Geometry and stationery sets",
    keywords: "set,kit",
  },
];

const CategoryContext = createContext(null);

function loadLegacyCategories() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CATEGORIES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export function CategoryProvider({ children }) {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromApi, setFromApi] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/categories");
      if (Array.isArray(data)) {
        setCategories(data);
        setFromApi(true);
        localStorage.removeItem(STORAGE_KEY);
        return data;
      }
    } catch {
      // fall through to legacy
    }
    setFromApi(false);
    setCategories(loadLegacyCategories());
    return null;
  }, []);

  // Load (or reload) when auth is ready so /categories gets a JWT.
  useEffect(() => {
    let active = true;
    setLoading(true);
    refresh()
      .catch(() => {
        if (!active) return;
        setFromApi(false);
        setCategories(loadLegacyCategories());
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refresh, user?.id]);

  // Persist only when still offline/legacy (API unavailable).
  useEffect(() => {
    if (loading || fromApi) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  }, [categories, fromApi, loading]);

  async function addCategory({ name, description = "", keywords = "" }) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Category name is required.");

    if (fromApi) {
      try {
        const { data } = await api.post("/categories", {
          name: trimmed,
          description: description.trim(),
          keywords: keywords.trim(),
        });
        setCategories((prev) =>
          [...prev, data].sort((a, b) => a.name.localeCompare(b.name))
        );
        return data;
      } catch (err) {
        throw new Error(err.response?.data?.message || "Couldn't create category.");
      }
    }

    const exists = categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) throw new Error("A category with that name already exists.");
    const category = {
      id: `cat-${Date.now()}`,
      name: trimmed,
      description: description.trim(),
      keywords: keywords.trim(),
    };
    setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)));
    return category;
  }

  async function updateCategory(id, { name, description = "", keywords = "" }) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Category name is required.");

    if (fromApi) {
      try {
        const { data } = await api.put(`/categories/${id}`, {
          name: trimmed,
          description: description.trim(),
          keywords: keywords.trim(),
        });
        setCategories((prev) =>
          prev
            .map((c) => (String(c.id) === String(id) ? data : c))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        return data;
      } catch (err) {
        throw new Error(err.response?.data?.message || "Couldn't update category.");
      }
    }

    const exists = categories.some(
      (c) => String(c.id) !== String(id) && c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) throw new Error("A category with that name already exists.");
    setCategories((prev) =>
      prev
        .map((c) =>
          String(c.id) === String(id)
            ? {
                ...c,
                name: trimmed,
                description: description.trim(),
                keywords: keywords.trim(),
              }
            : c
        )
        .sort((a, b) => a.name.localeCompare(b.name))
    );
  }

  async function deleteCategory(id) {
    if (fromApi) {
      try {
        await api.delete(`/categories/${id}`);
      } catch (err) {
        throw new Error(err.response?.data?.message || "Couldn't delete category.");
      }
    }
    setCategories((prev) => prev.filter((c) => String(c.id) !== String(id)));
  }

  const value = useMemo(
    () => ({
      categories,
      loading,
      fromApi,
      refresh,
      addCategory,
      updateCategory,
      deleteCategory,
    }),
    [categories, loading, fromApi, refresh]
  );

  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
}

export function useCategories() {
  const ctx = useContext(CategoryContext);
  if (!ctx) throw new Error("useCategories must be used inside CategoryProvider");
  return ctx;
}
