import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Lock, Eye, EyeOff, Shield, KeyRound, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { initializeCrmData } from "@/modules/crm/storage";

const PIN_STORAGE_KEY = "crm:pin";
const PIN_LENGTH = 4;

// Simple hash function for PIN (not cryptographically secure, but prevents casual viewing)
function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

function getStoredPinHash(): string | null {
  return localStorage.getItem(PIN_STORAGE_KEY);
}

function setStoredPinHash(hash: string): void {
  localStorage.setItem(PIN_STORAGE_KEY, hash);
}

export function isPinSet(): boolean {
  return !!getStoredPinHash();
}

export function clearPin(): void {
  localStorage.removeItem(PIN_STORAGE_KEY);
}

interface PinLockProps {
  onUnlock: () => void;
}

export default function PinLock({ onUnlock }: PinLockProps) {
  const [mode, setMode] = useState<"enter" | "setup" | "confirm">(
    isPinSet() ? "enter" : "setup"
  );
  const [pin, setPin] = useState(["", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", ""]);
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockTime, setLockTime] = useState(0);
  const [initializing, setInitializing] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize encryption and unlock
  const handleUnlock = async (enteredPin: string) => {
    setInitializing(true);
    try {
      await initializeCrmData(enteredPin);
      onUnlock();
    } catch (err) {
      console.error("Failed to initialize CRM data:", err);
      setError("Failed to decrypt data");
      setInitializing(false);
    }
  };

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, [mode]);

  // Lockout timer
  useEffect(() => {
    if (locked && lockTime > 0) {
      const timer = setTimeout(() => setLockTime((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (lockTime === 0 && locked) {
      setLocked(false);
      setAttempts(0);
    }
  }, [locked, lockTime]);

  const handlePinChange = (index: number, value: string, isConfirm = false) => {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);

    const targetPin = isConfirm ? confirmPin : pin;
    const setTargetPin = isConfirm ? setConfirmPin : setPin;

    const newPin = [...targetPin];
    newPin[index] = digit;
    setTargetPin(newPin);
    setError("");

    // Auto-focus next input
    if (digit && index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if PIN is complete
    if (newPin.every((d) => d !== "")) {
      const fullPin = newPin.join("");

      if (mode === "enter") {
        const storedHash = getStoredPinHash();
        if (hashPin(fullPin) === storedHash) {
          void handleUnlock(fullPin);
        } else {
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          setError("Incorrect PIN");
          setPin(["", "", "", ""]);
          inputRefs.current[0]?.focus();

          // Lock after 3 failed attempts
          if (newAttempts >= 3) {
            setLocked(true);
            setLockTime(30);
          }
        }
      } else if (mode === "setup") {
        setMode("confirm");
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else if (mode === "confirm") {
        const setupPin = pin.join("");
        if (fullPin === setupPin) {
          setStoredPinHash(hashPin(fullPin));
          void handleUnlock(fullPin);
        } else {
          setError("PINs don't match. Try again.");
          setConfirmPin(["", "", "", ""]);
          setPin(["", "", "", ""]);
          setMode("setup");
          setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent, isConfirm = false) => {
    const targetPin = isConfirm ? confirmPin : pin;
    const setTargetPin = isConfirm ? setConfirmPin : setPin;

    if (e.key === "Backspace") {
      if (targetPin[index] === "" && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newPin = [...targetPin];
        newPin[index - 1] = "";
        setTargetPin(newPin);
      } else {
        const newPin = [...targetPin];
        newPin[index] = "";
        setTargetPin(newPin);
      }
    }
  };

  const renderPinInputs = (values: string[], isConfirm = false) => (
    <div className="flex justify-center gap-3">
      {values.map((digit, idx) => (
        <Input
          key={idx}
          ref={(el) => {
            if (!isConfirm || mode === "confirm") {
              inputRefs.current[idx] = el;
            }
          }}
          type={showPin ? "text" : "password"}
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handlePinChange(idx, e.target.value, isConfirm)}
          onKeyDown={(e) => handleKeyDown(idx, e, isConfirm)}
          disabled={locked}
          className={cn(
            "w-14 h-14 text-center text-2xl font-bold border-2 rounded-xl transition-all",
            digit ? "border-indigo-500 bg-indigo-50" : "border-slate-200",
            error && "border-red-300 bg-red-50"
          )}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-8 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-center">
            <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
              {mode === "enter" ? (
                <Lock className="h-8 w-8 text-white" />
              ) : (
                <KeyRound className="h-8 w-8 text-white" />
              )}
            </div>
            <h1 className="text-xl font-bold text-white">
              {mode === "enter" ? "CRM Locked" : mode === "setup" ? "Set Up PIN" : "Confirm PIN"}
            </h1>
            <p className="text-sm text-white/80 mt-1">
              {mode === "enter"
                ? "Enter your 4-digit PIN to access CRM"
                : mode === "setup"
                ? "Create a 4-digit PIN to protect your data"
                : "Re-enter your PIN to confirm"}
            </p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {initializing ? (
              <div className="text-center py-8">
                <Loader2 className="h-12 w-12 text-indigo-500 mx-auto mb-4 animate-spin" />
                <p className="text-lg font-semibold text-slate-900">Decrypting Data...</p>
                <p className="text-sm text-slate-600 mt-1">
                  Please wait while we load your CRM data
                </p>
              </div>
            ) : locked ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-lg font-semibold text-slate-900">Too many attempts</p>
                <p className="text-sm text-slate-600 mt-1">
                  Try again in <span className="font-bold text-red-600">{lockTime}s</span>
                </p>
              </div>
            ) : (
              <>
                {mode === "confirm" ? renderPinInputs(confirmPin, true) : renderPinInputs(pin)}

                {error && (
                  <p className="text-center text-sm text-red-600 font-medium flex items-center justify-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </p>
                )}

                {/* Show/Hide PIN */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {showPin ? (
                      <>
                        <EyeOff className="h-4 w-4" />
                        Hide PIN
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4" />
                        Show PIN
                      </>
                    )}
                  </button>
                </div>

                {mode === "enter" && (
                  <p className="text-center text-xs text-slate-400">
                    Attempts: {attempts}/3
                  </p>
                )}
              </>
            )}

            {/* Security badge */}
            <div className="flex items-center justify-center gap-2 pt-4 border-t border-slate-100">
              <Shield className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-slate-500">AES-256 Encrypted</span>
            </div>
          </div>
        </div>

        {/* Help text */}
        <p className="text-center text-xs text-slate-400 mt-4">
          Data is encrypted and stored securely on this device
        </p>
      </div>
    </div>
  );
}
