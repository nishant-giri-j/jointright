import React, { useEffect, useState } from 'react';

const AnimatedPanel3D = ({ children, isOpen, type = 'card-flip' }) => {
  const [render, setRender] = useState(isOpen);
  const [activeClass, setActiveClass] = useState('');

  useEffect(() => {
    let timeoutId;
    if (isOpen) {
      setRender(true);
      // Let React mount the DOM, then trigger transition
      timeoutId = setTimeout(() => {
        setActiveClass('panel-3d-active');
      }, 20);
    } else {
      setActiveClass('');
      // Wait for CSS transitions (600ms) to complete before unmounting
      timeoutId = setTimeout(() => {
        setRender(false);
      }, 600);
    }
    return () => clearTimeout(timeoutId);
  }, [isOpen]);

  if (!render) return null;

  const animationClass = type === 'card-flip' ? 'panel-3d-card' : 'panel-3d-push';

  return (
    <div className={`panel-3d-container ${animationClass} ${activeClass}`}>
      <div className="panel-3d-inner">
        {children}
      </div>
    </div>
  );
};

export default AnimatedPanel3D;
