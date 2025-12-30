'use client';

export default function FeaturesList() {
  const features = [
    { icon: '🎯', title: 'Drag & Drop', desc: 'Intuitive card management' },
    { icon: '🌙', title: 'Dark Mode', desc: 'Easy on your eyes' },
    { icon: '☁️', title: 'Cloud Sync', desc: 'Access anywhere' },
    { icon: '⚡', title: 'Lightning Fast', desc: 'Built for speed' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {features.map((feature) => (
        <div key={feature.title} className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{feature.icon}</span>
          <div className="min-w-0">
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
              {feature.title}
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {feature.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
