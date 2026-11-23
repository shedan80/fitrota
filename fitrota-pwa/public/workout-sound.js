let context;

// Call from a tap or key event so mobile browsers can authorize the audio.
export function enableWorkoutSound() {
  try {
    const Audio = window.AudioContext ?? window.webkitAudioContext;
    if (!Audio) return;
    context ??= new Audio();
    if (context.state === 'suspended' || context.state === 'interrupted') context.resume().catch(() => {});
  } catch (_) {}
}

export function playRestChime() {
  if (context?.state !== 'running') return;
  const start = context.currentTime;
  [660,880].forEach((frequency,index) => {
    const at = start + index * .17;
    const tone = context.createOscillator();
    const volume = context.createGain();
    tone.type = 'sine';
    tone.frequency.value = frequency;
    volume.gain.setValueAtTime(.001,at);
    volume.gain.exponentialRampToValueAtTime(.18,at+.025);
    volume.gain.exponentialRampToValueAtTime(.001,at+.24);
    tone.connect(volume);
    volume.connect(context.destination);
    tone.start(at);
    tone.stop(at+.25);
  });
}
