import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import ForgotPinModal from '../modals/ForgotPinModal';


const LockScreen: React.FC = () => {
    const { security, unlockApp } = useApp();
    const [pinBuffer, setPinBuffer] = useState<string>('');
    const [errorShake, setErrorShake] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [forgotModalOpen, setForgotModalOpen] = useState(false);

    useEffect(() => {
        if (pinBuffer.length === 4) {
            if (pinBuffer === security.pin) {
                unlockApp();
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setPinBuffer('');
                setErrorMessage('');
            } else {
                setErrorShake(true);
                setErrorMessage('Incorrect PIN. Try again.');

                setTimeout(() => {
                    setErrorShake(false);
                    setPinBuffer('');
                }, 500);

                // Optional: auto-hide message after a moment
                setTimeout(() => {
                    setErrorMessage('');
                }, 2000);
            }
        }
    }, [pinBuffer, security.pin, unlockApp]);

    const enterPin = React.useCallback((num: number) => {
        if (pinBuffer.length < 4) {
            setErrorMessage('');
            setPinBuffer(prev => prev + num);
        }
    }, [pinBuffer.length]);

    const handleBackspace = React.useCallback(() => {
        setErrorMessage('');
        setPinBuffer(prev => prev.slice(0, -1));
    }, []);

    // Keyboard support
    useEffect(() => {
        if (!security.locked) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key >= '0' && e.key <= '9') {
                enterPin(parseInt(e.key, 10));
            } else if (e.key === 'Backspace') {
                handleBackspace();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [security.locked, enterPin, handleBackspace]);

    if (!security.locked) return null;

    return (
        <div
            id="lock-screen"
            className="fixed inset-0 z-[100] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center text-gray-800 dark:text-white transition-colors duration-300"
        >
            {/* App Logo/Branding */}
            <div className="mb-8 flex flex-col items-center">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
                    <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold tracking-tight mb-1">AnnotaLoop Locked</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Type your PIN to unlock</p>
            </div>

            {/* PIN Input Boxes */}
            <div id="pin-display" className={`flex gap-3 mb-3 ${errorShake ? 'animate-pulse' : ''}`}>
                {[0, 1, 2, 3].map(idx => (
                    <div
                        key={idx}
                        className={`pin-column w-12 h-14 flex items-center justify-center text-3xl font-bold bg-white dark:bg-gray-800 border-2 rounded-lg transition-all ${idx === pinBuffer.length
                            ? 'border-primary ring-2 ring-primary/20'
                            : idx < pinBuffer.length
                                ? 'border-primary text-gray-800 dark:text-white'
                                : 'border-gray-200 dark:border-gray-700'
                            }`}
                    >
                        {idx < pinBuffer.length ? '•' : idx === pinBuffer.length ? (
                            // UPDATED: steps(2) creates the hard blink effect
                            <span className="animate-[pulse_1s_steps(2)_infinite] w-0.5 h-6 bg-primary block"></span>
                        ) : (
                            ''
                        )}
                    </div>
                ))}
            </div>

            {/* Error message */}
            <div className="h-5 mb-4">
                {errorMessage && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
                )}
            </div>

            <button
                onClick={() => setForgotModalOpen(true)}
                className="text-sm text-primary hover:underline mb-2 transition-colors"
            >
                Forgot PIN?
            </button>
            <p className="text-xs text-gray-400 mt-8">AnnotaLoop v2.4.0</p>

            <ForgotPinModal isOpen={forgotModalOpen} onClose={() => setForgotModalOpen(false)} />
        </div>
    );
};

export default LockScreen;