import { useContext } from "react";
import { BookshelfContext } from "@/contexts/bookshelf.context";

export function useBookshelf() {
  const context = useContext(BookshelfContext);
  if (!context) {
    throw new Error("useBookshelf must be used within BookshelfProvider");
  }
  return context;
}