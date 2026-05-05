import React from "react";

export default function HeroScene() {
  return (
    <div className="relative w-full max-w-5xl mx-auto" style={{ aspectRatio: "16 / 8" }}>
      <svg viewBox="0 0 1200 600" className="w-full h-full">
        {/* Background blob */}
        <g className="scene-blob" style={{ animationDelay: "0.05s" }}>
          <path d="M150 350 C 120 180, 320 80, 500 110 C 680 138, 760 70, 950 90
                   C 1120 110, 1180 220, 1150 380 C 1120 540, 950 560, 750 540
                   C 550 522, 380 560, 250 530 C 120 502, 180 480, 150 350 Z"
            fill="#E9F0FB" />
        </g>

        {/* Floor Line */}
        <line x1="100" y1="540" x2="1100" y2="540" stroke="#0f1b3d" strokeWidth="1.5" strokeDasharray="6,6" opacity="0.15" />

        {/* Character 1 — Boy in white shirt holding small coin (Left) */}
        <g className="scene-character" style={{ animationDelay: "0.2s", transformOrigin: "180px 540px" }}>
          <path d="M165 540 L195 540 L190 440 L170 440 Z" fill="#1f2d5c" /> {/* Pants */}
          <rect x="165" y="440" width="30" height="50" rx="4" fill="#FFFFFF" /> {/* Shirt */}
          <circle cx="180" cy="420" r="18" fill="#ffd0b0" /> {/* Face */}
          <path d="M168 412 Q180 400 192 412" fill="#0f1b3d" /> {/* Hair */}
          <circle cx="210" cy="470" r="18" fill="#F97066" /> {/* Coin */}
          <text x="210" y="476" fontSize="12" textAnchor="middle" fill="white" fontWeight="bold">$</text>
        </g>

        {/* Character 2 — Dad in blue shirt with kid on shoulders */}
        <g className="scene-character" style={{ animationDelay: "0.5s", transformOrigin: "350px 540px" }}>
          <path d="M325 540 L375 540 L370 420 L330 420 Z" fill="#1f2d5c" /> {/* Pants */}
          <rect x="325" y="420" width="50" height="70" rx="6" fill="#2b6cff" /> {/* Shirt */}
          <circle cx="350" cy="395" r="22" fill="#ffd0b0" /> {/* Face */}
          <path d="M335 382 Q350 370 365 382" fill="#0f1b3d" /> {/* Hair */}
          {/* Kid */}
          <rect x="338" y="340" width="24" height="30" rx="4" fill="#FFFFFF" /> {/* Kid Shirt */}
          <circle cx="350" cy="325" r="14" fill="#ffd0b0" /> {/* Kid Face */}
          <path d="M342 318 Q350 310 358 318" fill="#0f1b3d" /> {/* Kid Hair */}
          <path d="M375 425 Q410 420 440 440" fill="none" stroke="#ffd0b0" strokeWidth="8" strokeLinecap="round" /> {/* Reaching hand */}
        </g>

        {/* Central Coin Stack */}
        <g style={{ transformOrigin: "520px 520px" }}>
          {[...Array(10)].map((_, i) => {
            const y = 520 - i * 22;
            return (
              <g key={i} className="scene-coin"
                style={{ animationDelay: `${1.0 + i * 0.08}s` }}>
                <ellipse cx="520" cy={y + 5} rx="65" ry="12" fill="#d8543d" />
                <ellipse cx="520" cy={y} rx="65" ry="12" fill="#F97066" />
                <rect x="455" y={y} width="130" height="5" fill="#d8543d" />
              </g>
            );
          })}
          {/* Top coin symbol */}
          <text x="520" y="300" fontSize="24" textAnchor="middle" fill="#FFFFFF" fontWeight="bold" opacity="0.8" className="float-loop">$</text>
        </g>

        {/* Character 3 — Girl in light-blue watering plant */}
        <g className="scene-character" style={{ animationDelay: "1.0s", transformOrigin: "780px 540px" }}>
          <path d="M765 540 L795 540 L790 450 L770 450 Z" fill="#1f2d5c" /> {/* Pants */}
          <rect x="765" y="450" width="30" height="40" rx="4" fill="#AFC3E6" /> {/* Shirt */}
          <circle cx="780" cy="430" r="18" fill="#ffd0b0" /> {/* Face */}
          <path d="M768 422 Q780 410 792 422" fill="#0f1b3d" /> {/* Hair */}
          <rect x="795" y="460" width="25" height="15" rx="3" fill="#1f2d5c" /> {/* Watering Can */}
          <path d="M820 470 L830 485" stroke="#1f2d5c" strokeWidth="2" strokeDasharray="2,2" /> {/* Water */}
        </g>

        {/* Dollar Plant */}
        <g className="scene-leaf" style={{ animationDelay: "1.4s", transformOrigin: "850px 540px" }}>
          <path d="M848 420 L852 420 L852 540 L848 540 Z" fill="#16A34A" /> {/* Stem */}
          <path d="M850 500 Q880 480 850 460 Z" fill="#AFC3E6" opacity="0.4" /> {/* Leaf */}
          <path d="M850 470 Q820 450 850 430 Z" fill="#AFC3E6" opacity="0.4" /> {/* Leaf */}
          <path d="M850 440 Q880 420 850 400 Z" fill="#AFC3E6" opacity="0.4" /> {/* Leaf */}
          <g className="float-loop">
            <circle cx="850" cy="380" r="30" fill="#F97066" /> {/* Plant Coin */}
            <text x="850" y="388" fontSize="24" textAnchor="middle" fill="white" fontWeight="bold">$</text>
          </g>
        </g>

        {/* Dog (Jumping) */}
        <g className="scene-character" style={{ animationDelay: "1.3s", transformOrigin: "900px 540px" }}>
          <ellipse cx="900" cy="520" rx="22" ry="12" fill="#F97066" /> {/* Dog Body */}
          <circle cx="920" cy="510" r="8" fill="#F97066" /> {/* Dog Head */}
          <path d="M885 520 L895 535 M905 520 L915 535" stroke="#F97066" strokeWidth="3" /> {/* Legs */}
        </g>

        {/* Character 4 — Woman in white shirt holding huge coin (Right) */}
        <g className="scene-character" style={{ animationDelay: "0.8s", transformOrigin: "1050px 540px" }}>
          <path d="M1035 540 L1065 540 L1060 420 L1040 420 Z" fill="#1f2d5c" /> {/* Pants */}
          <rect x="1035" y="420" width="30" height="60" rx="4" fill="#FFFFFF" /> {/* Shirt */}
          <circle cx="1050" cy="400" r="22" fill="#ffd0b0" /> {/* Face */}
          <path d="M1035 390 C1035 350, 1065 350, 1065 390" fill="#0f1b3d" /> {/* Long Hair */}
          <g className="float-loop" style={{ animationDelay: "0.5s" }}>
            <circle cx="1020" cy="460" r="35" fill="#F97066" /> {/* Huge Coin */}
            <text x="1020" y="470" fontSize="30" textAnchor="middle" fill="white" fontWeight="bold">$</text>
          </g>
        </g>

        {/* Background Leaves */}
        <path d="M100 200 Q120 150 140 200" fill="#6C8CD5" opacity="0.05" className="scene-leaf--swaying" />
        <path d="M1100 150 Q1120 100 1140 150" fill="#6C8CD5" opacity="0.05" className="scene-leaf--swaying" />

      </svg>
    </div>
  );
}
