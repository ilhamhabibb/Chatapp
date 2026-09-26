"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicUser } from "@chating/contracts";
import { apiFetch } from "../../lib/api";
import { Avatar } from "../../components/ui/avatar";
import { StatusDot } from "../../components/ui/status-dot";
import { TextInput } from "../../components/ui/primitives";
import { UsersIcon } from "../../components/ui/icons";

type UserSearchPickerProps = {
  currentUserId: string;
  onPick: (user: PublicUser) => void | Promise<void>;
  disabled?: boolean | undefined;
};

export function UserSearchPicker({ currentUserId, onPick, disabled }: UserSearchPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const requestRef = useRef(0);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const ticket = ++requestRef.current;
    const timer = setTimeout(() => {
      apiFetch<PublicUser[]>(`/api/users?query=${encodeURIComponent(term)}`)
        .then((users) => {
          if (requestRef.current !== ticket) return;
          setResults(users.filter((user) => user.id !== currentUserId));
          setActiveIndex(0);
          setError("");
        })
        .catch((caught: unknown) => {
          if (requestRef.current !== ticket) return;
          setResults([]);
          setError(caught instanceof Error ? caught.message : "Pencarian gagal");
        })
        .finally(() => {
          if (requestRef.current === ticket) setSearching(false);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [query, currentUserId]);

  async function pick(user: PublicUser) {
    setQuery("");
    setResults([]);
    await onPick(user);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = results[activeIndex];
      if (target) void pick(target);
    } else if (event.key === "Escape") {
      setResults([]);
    }
  }

  const showPanel = query.trim().length >= 2;

  return (
    <div className="relative">
      <TextInput
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Cari username..."
        aria-label="Cari user untuk private chat"
        autoComplete="off"
        disabled={disabled}
        role="combobox"
        aria-expanded={showPanel && results.length > 0}
        aria-controls="user-search-results"
      />

      {showPanel ? (
        <div
          id="user-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-field border border-hairline bg-surface shadow-lg"
        >
          {searching && results.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-faint">Mencari...</p>
          ) : null}
          {!searching && results.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-faint">
              {error || `Tidak ada user untuk "${query.trim()}"`}
            </p>
          ) : null}
          <ul className="max-h-56 overflow-y-auto">
            {results.map((user, index) => (
              <li key={user.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onClick={() => void pick(user)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors ${
                    index === activeIndex ? "bg-selected" : "hover:bg-hover"
                  }`}
                >
                  <span className="relative shrink-0">
                    <Avatar name={user.displayName} seed={user.id} size={30} />
                    <span className="absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-surface">
                      <StatusDot status={user.isOnline ? "online" : "offline"} size={10} />
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-heading">
                      {user.displayName}
                    </span>
                    <span className="block truncate text-[11px] text-faint">@{user.username}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!showPanel ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-faint">
          <UsersIcon width={12} height={12} />
          Ketik minimal 2 karakter untuk mencari user.
        </p>
      ) : null}
    </div>
  );
}
