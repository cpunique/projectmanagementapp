import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  // Simple UUID-like ID generator
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
}

export function getDateISO(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}

export function isOverdue(dueDate: string | undefined): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date() && !isToday(dueDate);
}

export function isToday(dateString: string | undefined): boolean {
  if (!dateString) return false;
  return dateString === getDateISO();
}

export function formatDate(dateString: string | undefined): string {
  if (!dateString) return "";

  // Check if it's an ISO timestamp (contains T) or just a date string
  let date: Date;

  if (dateString.includes('T')) {
    // ISO timestamp - parse directly
    date = new Date(dateString);
  } else {
    // Date string in YYYY-MM-DD format - parse as local date (avoid timezone shift)
    const [year, month, day] = dateString.split('-').map(Number);
    date = new Date(year, month - 1, day);
  }

  if (isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function calculateChecklistProgress(
  checklist: Array<{ completed: boolean }> | undefined
): number {
  if (!checklist || checklist.length === 0) return 0;
  const completed = checklist.filter((item) => item.completed).length;
  return Math.round((completed / checklist.length) * 100);
}

export function downloadJSON(data: any, filename: string) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function readJSON<T>(file: File): Promise<T> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        resolve(json);
      } catch (error) {
        reject(new Error("Failed to parse JSON file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

/**
 * Determines if a hex color is light or dark based on luminance
 * Returns true if the color is light (needs dark text)
 */
export function isLightColor(hexColor: string): boolean {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance using the formula:
  // https://www.w3.org/TR/WCAG20/#relativeluminancedef
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // If luminance > 0.5, it's a light color
  return luminance > 0.5;
}

/**
 * Returns the appropriate default card color based on dark mode
 * White (#ffffff) for light mode, dark gray (#1f2937) for dark mode
 */
export function getDefaultCardColor(isDarkMode: boolean): string {
  return isDarkMode ? '#1f2937' : '#ffffff';
}
