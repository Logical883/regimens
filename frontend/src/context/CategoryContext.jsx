import { createContext, useContext, useEffect, useMemo, useState } from "react";

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

function loadCategories() {
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
  const [categories, setCategories] = useState(() => loadCategories());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  }, [categories]);

  function addCategory({ name, description = "", keywords = "" }) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error("Category name is required.");
    }
    const exists = categories.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      throw new Error("A category with that name already exists.");
    }
    const category = {
      id: `cat-${Date.now()}`,
      name: trimmed,
      description: description.trim(),
      keywords: keywords.trim(),
    };
    setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)));
    return category;
  }

function updateCategory(id, { name, description = "", keywords = "" }) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required.");
  const exists = categories.some(
    (c) => c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (exists) throw new Error("A category with that name already exists.");
  setCategories((prev) =>
    prev
      .map((c) =>
        c.id === id
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

function deleteCategory(id) {
  setCategories((prev) => prev.filter((c) => c.id !== id));
}

  const value = useMemo(
    () => ({ categories, addCategory, updateCategory, deleteCategory }),
    [categories]
  );

  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
}

export function useCategories() {
  const ctx = useContext(CategoryContext);
  if (!ctx) throw new Error("useCategories must be used inside CategoryProvider");
  return ctx;
}