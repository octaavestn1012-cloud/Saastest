"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useAnimation, useMotionValue, useTransform } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";

interface SlideToConfirmProps {
  onConfirm: () => void;
  text?: string;
  confirmedText?: string;
}

export function SlideToConfirm({
  onConfirm,
  text = "Glisser pour confirmer",
  confirmedText = "Confirmé",
}: SlideToConfirmProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const x = useMotionValue(0);
  const controls = useAnimation();

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, []);

  const handleDragEnd = () => {
    // Si on a glissé à plus de 80% de la largeur, on confirme
    const threshold = containerWidth * 0.8;
    if (x.get() > threshold && !isConfirmed) {
      setIsConfirmed(true);
      controls.start({ x: containerWidth - 56 }); // 56 est la largeur du bouton env.
      onConfirm();
    } else {
      // Sinon on remet à zéro avec un petit rebond
      controls.start({ x: 0, transition: { type: "spring", stiffness: 300, damping: 20 } });
    }
  };

  // L'opacité du texte change quand on glisse
  const textOpacity = useTransform(x, [0, containerWidth * 0.5], [1, 0]);
  const bgOpacity = useTransform(x, [0, containerWidth * 0.8], [0.1, 1]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-14 bg-black/[0.05] rounded-full overflow-hidden flex items-center justify-center border border-black/10"
    >
      <motion.div
        className="absolute left-0 top-0 bottom-0 bg-primary rounded-full z-0"
        style={{ width: useTransform(x, (v) => v + 56) }}
      />
      
      {!isConfirmed && (
        <motion.span
          style={{ opacity: textOpacity }}
          className="pointer-events-none z-10 text-sm font-semibold text-black/60 pl-8"
        >
          {text}
        </motion.span>
      )}

      {isConfirmed && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="pointer-events-none z-10 text-sm font-semibold text-white pl-8"
        >
          {confirmedText}
        </motion.span>
      )}

      <motion.div
        drag={isConfirmed ? false : "x"}
        dragConstraints={{ left: 0, right: containerWidth - 56 }}
        dragElastic={0}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className={`absolute left-1 top-1 bottom-1 w-[48px] rounded-full bg-white shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing z-20 ${
          isConfirmed ? "bg-white" : ""
        }`}
      >
        {isConfirmed ? (
          <Check className="w-5 h-5 text-primary" />
        ) : (
          <ArrowRight className="w-5 h-5 text-primary" />
        )}
      </motion.div>
    </div>
  );
}
