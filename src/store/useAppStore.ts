import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserResponse, BroadcasterListItem } from "@/types/api";

interface AppState {
  // Current logged-in user (in-memory only)
  currentUser: UserResponse | null;
  setCurrentUser: (user: UserResponse | null) => void;

  // Available broadcasters the user can access
  broadcasters: BroadcasterListItem[];
  setBroadcasters: (broadcasters: BroadcasterListItem[]) => void;

  // Selected broadcaster ID (persisted to localStorage)
  selectedBroadcasterId: string | null;
  setSelectedBroadcasterId: (id: string | null) => void;

  // Derived: get the currently selected broadcaster item
  getSelectedBroadcaster: () => BroadcasterListItem | null;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),

      broadcasters: [],
      setBroadcasters: (broadcasters) => set({ broadcasters }),

      selectedBroadcasterId: null,
      setSelectedBroadcasterId: (id) => set({ selectedBroadcasterId: id }),

      getSelectedBroadcaster: () => {
        const { broadcasters, selectedBroadcasterId } = get();
        return broadcasters.find((b) => b.channel_id === selectedBroadcasterId) ?? null;
      },
    }),
    {
      name: "necko7-app-store",
      // Only persist selectedBroadcasterId to localStorage
      partialize: (state) => ({
        selectedBroadcasterId: state.selectedBroadcasterId,
      }),
    }
  )
);
