"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { User, Briefcase, Upload, X, ArrowRight, Loader2, Plus, LogIn } from "lucide-react"
import { useRequireAuth } from "@/lib/useAuth"
import { useAuthStore } from "@/store/useAuthStore"

type Step = "profile" | "workspace"

export default function OnboardingPage() {
  const { user, userId, checking: authChecking } = useRequireAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const wsFileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>("profile")
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState("")
  const [logoTheme, setLogoTheme] = useState<'light' | 'dark'>('light')

  // Handle logo theme sync
  useEffect(() => {
    const html = document.documentElement
    const updateLogo = () => {
      const current = html.getAttribute('data-theme') as 'light' | 'dark' | null
      if (current) setLogoTheme(current)
      else {
        // Fallback to media query if no data-theme
        setLogoTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      }
    }
    updateLogo()
    const obs = new MutationObserver(updateLogo)
    obs.observe(html, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!userId) return

    const checkAndRedirect = async () => {
      try {
        const token = useAuthStore.getState().accessToken
        if (!token) return

        const res = await fetch("/api/me/bootstrap", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (res.status === 401) {
          return
        }

        if (res.ok) {
          const data = await res.json()
          if (data.workspaceId) {
            router.replace(`/workspace/${data.workspaceId}`)
            return
          }

          if (data.profile?.full_name) {
            setFullName(data.profile.full_name)
            setJobTitle(data.profile.job_title || "")
            setStep("workspace")
          }
        }
      } catch (err) {
        console.error("Failed to bootstrap onboarding state", err)
      } finally {
        setChecking(false)
      }
    }

    checkAndRedirect()
  }, [userId, router])

  // Profile fields
  const [fullName, setFullName] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState("")

  // Workspace fields
  const [wsMode, setWsMode] = useState<"create" | "join">("create")
  const [wsName, setWsName] = useState("")
  const [wsDescription, setWsDescription] = useState("")
  const [wsImageFile, setWsImageFile] = useState<File | null>(null)
  const [wsImagePreview, setWsImagePreview] = useState("")
  const [joinId, setJoinId] = useState("")

  // ── Image helpers ──
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleWsImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setWsImageFile(file)
    setWsImagePreview(URL.createObjectURL(file))
  }

  // ── Upload file to Supabase Storage ──
  const uploadFile = async (file: File, bucket: string, path: string): Promise<string | null> => {
    return null
  }

  // ── Generate short workspace ID ──
  const generateWorkspaceId = () =>
    Math.random().toString(36).substring(2, 10).toUpperCase()

  // ── Step 1: Save Profile ──
  const handleSaveProfile = async () => {
    setError("")
    if (!fullName.trim()) return setError("Please enter your full name.")
    if (!jobTitle.trim()) return setError("Please enter your job title.")
    setStep("workspace")
  }

  // ── Step 2: Create or Join Workspace ──
  const handleWorkspace = async () => {
    if (!userId) {
      router.replace("/auth")
      return
    }

    setError("")
    setLoading(true)

    // Upload avatar if provided
    let avatarUrl = ""
    if (avatarFile) {
      avatarUrl = await uploadFile(avatarFile, "avatars", `${userId}/avatar`) || ""
    }

    // Save user profile securely via server API route
    const token = useAuthStore.getState().accessToken;
    const apiFetch = async (url: string, options: RequestInit = {}) => {
      return fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
      });
    };

    const profileRes = await apiFetch("/api/profile/save", {
      method: "POST",
      body: JSON.stringify({
        fullName: fullName.trim(),
        jobTitle: jobTitle.trim(),
        avatarUrl: avatarUrl || null,
      }),
    });

    if (!profileRes.ok) {
      const errData = await profileRes.json().catch(() => ({}));
      setLoading(false);
      return setError(errData.error || "Failed to save profile. Please try again.");
    }

    if (wsMode === "join") {
      if (!joinId.trim()) {
        setLoading(false)
        return setError("Please enter a workspace ID.")
      }

      const joinRes = await apiFetch("/api/workspaces/join", {
        method: "POST",
        body: JSON.stringify({
          code: joinId.trim().toUpperCase(),
          fullName: fullName.trim(),
        }),
      });

      if (!joinRes.ok) {
        const errData = await joinRes.json().catch(() => ({}));
        setLoading(false);
        return setError(errData.error || "Workspace not found or failed to join. Please check the ID.");
      }

      const { workspace } = await joinRes.json();

      setLoading(false)
      router.push(`/workspace/${workspace.id}`)
    } else {
      // Create new workspace
      if (!wsName.trim()) {
        setLoading(false)
        return setError("Please enter a workspace name.")
      }

      let wsImageUrl = ""
      if (wsImageFile) {
        wsImageUrl = await uploadFile(wsImageFile, "workspace-images", `${userId}/ws-image-${Date.now()}`) || ""
      }

      const createRes = await apiFetch("/api/workspaces/create", {
        method: "POST",
        body: JSON.stringify({
          name: wsName.trim(),
          description: wsDescription.trim() || null,
          imageUrl: wsImageUrl || null,
          fullName: fullName.trim(),
        }),
      });

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        setLoading(false);
        return setError(errData.error || "Failed to create workspace. Please try again.");
      }

      const { workspace } = await createRes.json();

      setLoading(false)
      router.push(`/workspace/${workspace.id}`)
    }
  }

  const isChecking = authChecking || checking

  // ─────────────────────────────────────────────
  if (isChecking) return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={28} color="var(--accent)" className="animate-spin" />
    </div>
  )

  if (loading) return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={28} color="var(--accent)" className="animate-spin" />
    </div>
  )

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: "var(--bg-primary)", color: "var(--text-primary)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "24px", fontFamily: "var(--font-geist-sans), -apple-system, sans-serif",
    }}>

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "40px" }}>
        <img
          src={logoTheme === "light" ? "/LogoStandarddarktransp.png" : "/LogoStandardlighttransp.png"}
          alt="TrexaFlow"
          style={{ height: 32, width: "auto", objectFit: "contain", userSelect: "none" }}
        />
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "32px" }}>
        {["Profile", "Workspace"].map((label, i) => {
          const isActive = (i === 0 && step === "profile") || (i === 1 && step === "workspace")
          const isDone = i === 0 && step === "workspace"
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <div style={{
                  width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.75rem", fontWeight: 700,
                  backgroundColor: isDone ? "var(--success)" : isActive ? "var(--accent)" : "var(--bg-hover)",
                  color: isDone || isActive ? "var(--accent-foreground)" : "var(--text-muted)",
                  transition: "all 0.2s",
                }}>
                  {isDone ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: "0.83rem", fontWeight: 500, color: isActive ? "var(--text-primary)" : "var(--text-secondary)" }}>
                  {label}
                </span>
              </div>
              {i === 0 && (
                <div style={{ width: 32, height: 1, backgroundColor: step === "workspace" ? "var(--border-strong)" : "var(--border-color)", margin: "0 4px" }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: "460px",
        backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)",
        borderRadius: "20px", padding: "40px 36px",
        boxShadow: "0 24px 80px var(--shadow-color)",
      }}>

        {/* ── STEP 1: Profile ── */}
        {step === "profile" && (
          <>
            <div style={{ marginBottom: "28px" }}>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "6px" }}>Set up your profile</h1>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>How you'll appear to your teammates</p>
            </div>

            {/* Avatar upload */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "28px" }}>
              <div style={{ position: "relative" }}>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: 84, height: 84, borderRadius: "50%", cursor: "pointer",
                    backgroundColor: "var(--bg-input)", border: "2px dashed var(--border-strong)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    overflow: "hidden", transition: "border-color 0.2s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-strong)")}
                >
                  {avatarPreview
                    ? <img src={avatarPreview} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <Upload size={20} color="var(--text-muted)" />
                  }
                </div>
                {avatarPreview && (
                  <button onClick={() => { setAvatarFile(null); setAvatarPreview(""); }} style={{
                    position: "absolute", top: -4, right: -4, width: 22, height: 22,
                    borderRadius: "50%", backgroundColor: "var(--accent)", border: "none",
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  }}>
                    <X size={11} color="var(--accent-foreground)" />
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
              </div>
            </div>
            <p style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "-20px", marginBottom: "24px" }}>
              Click to upload photo (optional)
            </p>

            {/* Full Name */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "7px" }}>
                Full Name <span style={{ color: "var(--accent)" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <User size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="text" placeholder="e.g. John Smith" value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSaveProfile()}
                  style={{
                    width: "100%", padding: "11px 13px 11px 36px",
                    backgroundColor: "var(--bg-input)", border: "1.5px solid var(--border-color)",
                    borderRadius: "9px", color: "var(--text-primary)", fontSize: "0.9rem", outline: "none",
                  }}
                  onFocus={e => (e.target.style.borderColor = "var(--accent)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border-color)")}
                />
              </div>
            </div>

            {/* Job Title */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "7px" }}>
                Job Title / Designation <span style={{ color: "var(--accent)" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <Briefcase size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="text" placeholder="e.g. Product Designer, Software Engineer" value={jobTitle}
                  onChange={e => setJobTitle(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSaveProfile()}
                  style={{
                    width: "100%", padding: "11px 13px 11px 36px",
                    backgroundColor: "var(--bg-input)", border: "1.5px solid var(--border-color)",
                    borderRadius: "9px", color: "var(--text-primary)", fontSize: "0.9rem", outline: "none",
                  }}
                  onFocus={e => (e.target.style.borderColor = "var(--accent)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border-color)")}
                />
              </div>
            </div>

            {error && (
              <p style={{ color: "var(--error)", fontSize: "0.82rem", marginBottom: "16px", padding: "10px 14px", backgroundColor: "var(--error-bg)", borderRadius: "8px" }}>
                {error}
              </p>
            )}

            <button onClick={handleSaveProfile} style={{
              width: "100%", padding: "13px", borderRadius: "10px",
              backgroundColor: "var(--accent)", color: "var(--accent-foreground)", border: "none",
              fontSize: "0.95rem", fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--accent-hover)")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--accent)")}
            >
              Continue <ArrowRight size={16} />
            </button>
          </>
        )}

        {/* ── STEP 2: Workspace ── */}
        {step === "workspace" && (
          <>
            <div style={{ marginBottom: "24px" }}>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "6px" }}>Your workspace</h1>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Create a new one or join an existing workspace</p>
            </div>

            {/* Toggle */}
            <div style={{
              display: "flex", backgroundColor: "var(--bg-primary)", borderRadius: "10px",
              padding: "4px", marginBottom: "28px", border: "1px solid var(--border-color)",
            }}>
              {([["create", "Create workspace"], ["join", "Join workspace"]] as const).map(([m, label]) => (
                <button key={m} onClick={() => { setWsMode(m); setError(""); }} style={{
                  flex: 1, padding: "8px", borderRadius: "7px", border: "none",
                  fontSize: "0.88rem", fontWeight: 500, cursor: "pointer", transition: "all 0.15s",
                  backgroundColor: wsMode === m ? "var(--accent)" : "transparent",
                  color: wsMode === m ? "var(--accent-foreground)" : "var(--text-secondary)",
                }}>
                  {label}
                </button>
              ))}
            </div>

            {wsMode === "create" ? (
              <>
                {/* Workspace image */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
                  <div
                    onClick={() => wsFileInputRef.current?.click()}
                    style={{
                      width: 60, height: 60, borderRadius: 14, cursor: "pointer", flexShrink: 0,
                      backgroundColor: "var(--bg-input)", border: "2px dashed var(--border-strong)",
                      display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-strong)")}
                  >
                    {wsImagePreview
                      ? <img src={wsImagePreview} alt="ws" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <Plus size={18} color="var(--text-muted)" />
                    }
                  </div>
                  <div>
                    <p style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "3px" }}>Workspace Icon</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Optional · Click to upload</p>
                  </div>
                  <input ref={wsFileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleWsImageChange} />
                </div>

                {/* Workspace name */}
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "7px" }}>
                    Workspace Name <span style={{ color: "var(--accent)" }}>*</span>
                  </label>
                  <input
                    type="text" placeholder="e.g. Acme Corp" value={wsName}
                    onChange={e => setWsName(e.target.value)}
                    style={{
                      width: "100%", padding: "11px 13px",
                      backgroundColor: "var(--bg-input)", border: "1.5px solid var(--border-color)",
                      borderRadius: "9px", color: "var(--text-primary)", fontSize: "0.9rem", outline: "none",
                    }}
                    onFocus={e => (e.target.style.borderColor = "var(--accent)")}
                    onBlur={e => (e.target.style.borderColor = "var(--border-color)")}
                  />
                </div>

                {/* Description */}
                <div style={{ marginBottom: "24px" }}>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "7px" }}>
                    Description <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span>
                  </label>
                  <textarea
                    placeholder="What is this workspace for?" value={wsDescription}
                    onChange={e => setWsDescription(e.target.value)}
                    rows={3}
                    style={{
                      width: "100%", padding: "11px 13px", resize: "none",
                      backgroundColor: "var(--bg-input)", border: "1.5px solid var(--border-color)",
                      borderRadius: "9px", color: "var(--text-primary)", fontSize: "0.9rem", outline: "none",
                      fontFamily: "inherit",
                    }}
                    onFocus={e => (e.target.style.borderColor = "var(--accent)")}
                    onBlur={e => (e.target.style.borderColor = "var(--border-color)")}
                  />
                </div>
              </>
            ) : (
              /* Join workspace */
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "7px" }}>
                  Workspace ID
                </label>
                <input
                  type="text" placeholder="e.g. X4F2B7A1" value={joinId}
                  onChange={e => setJoinId(e.target.value.toUpperCase())}
                  style={{
                    width: "100%", padding: "11px 13px",
                    backgroundColor: "var(--bg-input)", border: "1.5px solid var(--border-color)",
                    borderRadius: "9px", color: "var(--text-primary)", fontSize: "0.9rem", outline: "none",
                    letterSpacing: "0.1em", fontWeight: 600,
                  }}
                  onFocus={e => (e.target.style.borderColor = "var(--accent)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border-color)")}
                />
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "8px" }}>
                  Ask your workspace admin for the ID to join their workspace.
                </p>
              </div>
            )}

            {error && (
              <p style={{ color: "var(--error)", fontSize: "0.82rem", marginBottom: "16px", padding: "10px 14px", backgroundColor: "var(--error-bg)", borderRadius: "8px" }}>
                {error}
              </p>
            )}

            <button onClick={handleWorkspace} disabled={loading} style={{
              width: "100%", padding: "13px", borderRadius: "10px",
              backgroundColor: "var(--accent)", color: "var(--accent-foreground)", border: "none",
              fontSize: "0.95rem", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = "var(--accent-hover)" }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "var(--accent)" }}
            >
              {loading && <Loader2 size={17} className="animate-spin" />}
              {wsMode === "create"
                ? <><Plus size={16} /> Create Workspace</>
                : <><LogIn size={16} /> Join Workspace</>
              }
            </button>

            <button onClick={() => { setStep("profile"); setError("") }} style={{
              width: "100%", marginTop: "12px", padding: "10px",
              background: "none", border: "none", color: "var(--text-muted)",
              fontSize: "0.83rem", cursor: "pointer",
            }}>
              ← Back to profile
            </button>
          </>
        )}
      </div>
    </div>
  )
}