'use client';

import { useEffect, useRef, useState } from 'react';

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    let animId: number;

    const particles: { x: number; y: number; vx: number; vy: number; r: number; color: string; alpha: number }[] = [];
    const colors = ['#9146FF', '#53FC18', '#E8FF3A', '#2EE59D', '#FF4D6D'];

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.5 + 0.2,
      });
    }

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouse);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // Gradient mesh background
      const gradient = ctx.createRadialGradient(
        w * 0.3 + Math.sin(Date.now() * 0.0003) * 100,
        h * 0.4 + Math.cos(Date.now() * 0.0002) * 80,
        0,
        w * 0.3,
        h * 0.4,
        w * 0.6
      );
      gradient.addColorStop(0, 'rgba(145, 70, 255, 0.08)');
      gradient.addColorStop(0.5, 'rgba(83, 252, 24, 0.04)');
      gradient.addColorStop(1, 'rgba(10, 10, 11, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      const gradient2 = ctx.createRadialGradient(
        w * 0.7 + Math.cos(Date.now() * 0.0004) * 120,
        h * 0.6 + Math.sin(Date.now() * 0.0003) * 100,
        0,
        w * 0.7,
        h * 0.6,
        w * 0.5
      );
      gradient2.addColorStop(0, 'rgba(232, 255, 58, 0.05)');
      gradient2.addColorStop(0.5, 'rgba(46, 229, 157, 0.03)');
      gradient2.addColorStop(1, 'rgba(10, 10, 11, 0)');
      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, w, h);

      // Particles
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      particles.forEach((p) => {
        // Mouse repulsion
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const force = (120 - dist) / 120 * 0.5;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }

        // Damping
        p.vx *= 0.99;
        p.vy *= 0.99;

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        glow.addColorStop(0, p.color);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.globalAlpha = p.alpha * 0.3;
        ctx.fill();
      });

      // Draw connections between nearby particles
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = '#E8FF3A';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.globalAlpha = (1 - dist / 150) * 0.08;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.7 }}
    />
  );
}
