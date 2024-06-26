import { useState, useEffect, useRef, useCallback } from "react";
import { keys, playNote } from "../../utils/tone";

import Piano from "../piano/Piano";
import Modal from "../modal/Modal";
import processGameResult from "../../services/api";

export default function MusicGame() {
    // State Variables
    const [sequence, setSequence] = useState<string[]>([]);
    const [playbackSpeed, setPlaybackSpeed] = useState(1000);
    const [gameActive, setGameActive] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [score, setScore] = useState(0);
    const [time, setTime] = useState(0);

    // Refs Variables
    const timeoutRefs = useRef<number[]>([]);
    const currentPosition = useRef(0);

    // Get the user_id from the URL
    const params = new URLSearchParams(window.location.search);
    const user_id = params.get('user_id');
    const game_id = 1;

    // Functions
    const startGame = () => {
        setGameActive(true);
        clearGame();
        setPlaybackSpeed(1000);
        currentPosition.current = 0;
        const initialSequence = generateSequence(4);
        setSequence(initialSequence);
        setTimeout(() => { playSequence(initialSequence, 1000); }, 1500);
    }

    const stopGame = () => {
        setGameActive(false);
        clearGame();
        setSequence([]);
        currentPosition.current = 0;
        setModalOpen(false);
        timeoutRefs.current.forEach(clearTimeout);
        timeoutRefs.current = [];
    }

    const clearGame = () => {
        setTime(0);
        setScore(0);
    }

    const generateSequence = (length: number) => {
        return Array.from({ length }, () => keys[Math.floor(Math.random() * keys.length)].note);
    }

    const playSequence = (sequence: string[], speed: number) => {
        let index = 0;
        const playNextNote = () => {
            if (index < sequence.length) {
                playNote(sequence[index]);
                timeoutRefs.current.push(window.setTimeout(playNextNote, speed));
                index++;
            }
        };
        playNextNote();
    }

    const closeModalAndRedirect = () => {
        setModalOpen(false);
        window.location.href = 'http://127.0.0.1:8000/games';
    }

    // Callbacks
    const processResult = useCallback(async () => {
        try {
            await processGameResult(score, user_id as string, game_id.toString(), time.toString());
        } catch (error) {
            console.error('Error al enviar el resultado del juego:', error);
        } finally {
            setModalOpen(true);
        }
    }, [score, user_id, game_id, time]);

    // Effects
    useEffect(() => {
        if (gameActive) {
            const timerId = setInterval(() => {
                setTime(prevTime => prevTime + 1);
            }, 1000);
            return () => clearInterval(timerId);
        }
    }, [gameActive]);

    useEffect(() => {
        function handleKeyPress(event: KeyboardEvent) {
            if (!gameActive) return;
            const key = keys.find(k => k.key.toLowerCase() === event.key.toLowerCase());

            if (key && sequence[currentPosition.current] === key.note) {
                setScore((currentScore) => currentScore + 10);
                if (currentPosition.current === sequence.length - 1) {
                    const newSequence = [...sequence, generateSequence(1)[0]];
                    const newSpeed = Math.max(100, playbackSpeed * 0.95);

                    setTimeout(() => {
                        setPlaybackSpeed(newSpeed);
                        setSequence(newSequence);
                        currentPosition.current = 0;
                        playSequence(newSequence, newSpeed);
                    }, 2000);
                } else {
                    currentPosition.current++;
                }
            } else if (key) {
                setGameActive(false);
                timeoutRefs.current.forEach(clearTimeout);
                timeoutRefs.current = [];
                setModalOpen(true);
                processResult();
            }
        }
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [sequence, playbackSpeed, gameActive, score, processResult]);

    // Render the component
    return (
        <section className="flex flex-col relative items-center w-full lg:w-3/5 h-[37rem] backdrop-blur-xl rounded-3xl border border-yellow-400 p-5">
            {/* Instructions */}
            <article className="flex flex-col absolute left-5 bg-white/20 w-fit px-4 py-3 rounded-xl text-sm">
                <div className='flex flex-col items-start gap-1'>
                    <p className='text-white font-semibold text-center mb-3'>Instructions:</p>
                    <p className='text-white font-medium text-center'>• Get score by replicating the keys pressed by the computer</p>
                    <p className='text-white font-medium text-center'>• With each correct sequence, the game increases the difficulty</p>
                    <p className='text-white font-medium text-center'>• If you press the wrong key you will be removed from the game</p>
                </div>
            </article>
            {/* Title */}
            <article className="flex absolute right-14 justify-center items-center gap-3 sm:gap-5 mt-7 mb-4">
                <img src="/src/assets/images/icon-music.png" className="w-8 sm:w-10 lg:w-12 xl:w-14" alt="Note of music" />
                <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-medium text-white font-sans">Virtual Piano Game</h1>
                <img src="/src/assets/images/icon-music.png" className="w-8 sm:w-10 lg:w-12 xl:w-14" alt="Note of music" />
            </article>
            {/* Piano Component */}
            <article className="flex-grow flex items-end justify-center w-full px-5">
                <Piano />
            </article>
            {/* Buttons */}
            <button onClick={gameActive ? stopGame : startGame} className={`font-semibold py-2.5 px-6 rounded-lg mt-3 transition-all ease-in-out duration-300
                ${gameActive
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-yellow-400 hover:bg-yellow-600'}`}>
                {gameActive ? 'Stop Game' : 'Start Game'}
            </button>
            {/* Time y Score */}
            <article className="flex flex-col absolute bottom-0 right-0 bg-white/20 w-fit px-8 py-2 m-4 rounded-xl text-white">
                <div className='flex flex-row justify-between gap-4'>
                    <div className='flex flex-col items-start min-w-20'>
                        <p className='font-medium'>Time:</p>
                        <p id="time" className='font-medium text-yellow-400'>{time} Sec</p>
                    </div>
                    <div className='flex flex-col items-center'>
                        <p className='font-medium'>Score:</p>
                        <p id="score" className='font-medium text-yellow-400'>{score}</p>
                    </div>
                </div>
            </article>
            {/* Modal Component */}
            <Modal isOpen={modalOpen} onClose={closeModalAndRedirect}>
                <p className="text-3xl font-semibold">¡ Game Over !</p>
                <p className="font-medium text-lg">Your score: <span className='text-yellow-600'>{score} Points</span></p>
            </Modal>
        </section>
    );
}