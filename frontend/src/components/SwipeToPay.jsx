import { useState, useRef, useEffect } from 'react';

export default function SwipeToPay({ onSwipe, label = "Swipe to Pay" }) {
  const [isSwiped, setIsSwiped] = useState(false);
  const [dragX, setDragX] = useState(0);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  const onStart = (clientX) => {
    if (isSwiped) return;
    isDragging.current = true;
  };

  const onMove = (clientX) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const maxWidth = rect.width - 48; // handle width (40) + margin (4+4)
    let newX = clientX - rect.left - 24; // center handle on cursor
    newX = Math.max(0, Math.min(newX, maxWidth));
    setDragX(newX);

    if (newX >= maxWidth * 0.9) {
      isDragging.current = false;
      setIsSwiped(true);
      setDragX(maxWidth);
      onSwipe();
    }
  };

  const onEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (!isSwiped) setDragX(0);
  };

  useEffect(() => {
    const handleMouseUp = () => onEnd();
    const handleMouseMove = (e) => onMove(e.clientX);
    const handleTouchMove = (e) => onMove(e.touches[0].clientX);
    
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isSwiped]);

  return (
    <div className="swipe-container" ref={containerRef}>
      <div className="swipe-bg" style={{ width: dragX + 24 }} />
      <div className="swipe-track">{isSwiped ? '' : label}</div>
      <div 
        className="swipe-handle" 
        style={{ transform: `translateX(${dragX}px)` }}
        onMouseDown={(e) => onStart(e.clientX)}
        onTouchStart={(e) => onStart(e.touches[0].clientX)}
      >
        {isSwiped ? '✓' : '→'}
      </div>
      {isSwiped && <div className="swipe-success">PAID</div>}
    </div>
  );
}
