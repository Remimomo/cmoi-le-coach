"use client";

import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type AuthUser = {
  id: string;
  email: string;
};

export default function AccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [configured, setConfigured] = useState(false);
  const [message, setMessage] = useState("Vérification du compte...");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    const response = await fetch("/api/auth/session");
    const data = await response.json();
    setConfigured(Boolean(data.configured));
    setUser(data.user ?? null);

    if (data.user && !recoveryToken) {
      router.replace("/");
      return;
    }

    setMessage(
      data.configured
         ? "Connecte-toi pour accéder à ton coach."
      : "Supabase n'est pas encore configuré. Il faudra ajouter les clés sur Vercel."
    );
  }, [recoveryToken, router]);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = hash.get("access_token");
    const type = hash.get("type");

    if (token && type === "recovery") {
      setRecoveryToken(token);
      setMessage("Choisis ton nouveau mot de passe.");
      window.history.replaceState(null, "", "/compte");
      return;
    }

    refreshSession();
  }, [refreshSession]);

  async function submit(mode: "signup" | "login") {
    setIsLoading(true);
    setMessage(mode === "signup" ? "Création du compte..." : "Connexion...");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, mode })
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Action impossible pour le moment.");
        return;
      }

      setUser(data.user ?? null);
      setMessage(mode === "signup" ? "Compte créé. Ouverture de ton coach..." : "Connexion réussie. Ouverture de ton coach...");
      router.replace("/");
    } finally {
      setIsLoading(false);
    }
  }

  async function requestPasswordReset() {
    if (!email) {
      setMessage("Indique ton email, puis clique sur mot de passe oublié.");
      return;
    }

    setIsLoading(true);
    setMessage("Envoi du lien de réinitialisation...");

    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await response.json();

      setMessage(
        response.ok
           ? "Email envoyé. Ouvre le lien reçu pour choisir un nouveau mot de passe."
          : data.error ?? "Envoi impossible pour le moment."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function updatePassword() {
    if (!recoveryToken || newPassword.length < 6) {
      setMessage("Choisis un mot de passe de 6 caractères minimum.");
      return;
    }

    setIsLoading(true);
    setMessage("Mise à jour du mot de passe...");

    try {
      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: recoveryToken, password: newPassword })
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Modification impossible pour le moment.");
        return;
      }

      setRecoveryToken(null);
      setNewPassword("");
      setPassword("");
      setMessage("Mot de passe modifié. Tu peux maintenant te connecter.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 pb-12 pt-5">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-mist/50">C&apos;moiLeCoach</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-night">Compte</h1>
        </div>
        <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-full border border-night/10 bg-white/70">
          <ArrowLeft className="h-5 w-5 text-moss" />
        </Link>
      </header>

      <section className="rounded-[28px] border border-night/10 bg-white/80 p-5 shadow-soft">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="mb-1 text-sm text-moss">Accès personnel</p>
            <h2 className="text-lg font-medium text-night">{recoveryToken ? "Nouveau mot de passe" : "Créer ou ouvrir ton compte"}</h2>
          </div>
          <UserRound className="h-5 w-5 text-ember" />
        </div>

        <p className="mb-4 rounded-2xl bg-moss/10 px-4 py-3 text-sm leading-6 text-mist/80">{message}</p>

        {recoveryToken ? (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm text-mist/70">Nouveau mot de passe</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="6 caractères minimum"
                className="w-full rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-night outline-none placeholder:text-mist/35"
              />
            </label>
            <button disabled={isLoading} onClick={updatePassword} className="w-full rounded-2xl bg-moss px-4 py-3 font-semibold text-night disabled:opacity-50">
              Enregistrer le nouveau mot de passe
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm text-mist/70">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ton@email.fr"
                className="w-full rounded-2xl border border-night/10 bg-white/70 px-4 py-3 text-night outline-none placeholder:text-mist/35"
              />
            </label>

            <label className="block">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm text-mist/70">Mot de passe</span>
                <button type="button" onClick={requestPasswordReset} disabled={isLoading || !configured} className="text-xs font-medium text-ember disabled:opacity-50">
                  Mot de passe oublié 
                </button>
              </div>
              <div className="flex items-center rounded-2xl border border-night/10 bg-white/70 px-4">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="6 caractères minimum"
                  className="min-w-0 flex-1 bg-transparent py-3 text-night outline-none placeholder:text-mist/35"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center text-mist"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button disabled={isLoading || !configured} onClick={() => submit("signup")} className="rounded-2xl bg-moss px-4 py-3 font-semibold text-night disabled:opacity-50">
                Créer mon compte
              </button>
              <button disabled={isLoading || !configured} onClick={() => submit("login")} className="rounded-2xl border border-night/10 bg-white/70 px-4 py-3 font-semibold text-night disabled:opacity-50">
                Déjà inscrit
              </button>
            </div>
          </div>
        )}

        <p className="mt-5 text-xs leading-5 text-mist/60">
          Ton compte permet de retrouver ton profil, ton état du jour et tes programmes entre ordinateur et téléphone.
        </p>
      </section>
    </main>
  );
}
