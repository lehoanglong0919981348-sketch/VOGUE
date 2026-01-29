
import React from 'react';
import { ImagePrompt } from '../types';

interface ImageCardProps {
  image: ImagePrompt;
}

const ImageCard: React.FC<ImageCardProps> = ({ image }) => {
  const formattedText = image.prompt_text
    .replace(/(\[SCENE_START\])/g, '$1')
    .replace(/(PHOTOGRAPHY STYLE:|MODEL:|OUTFIT:|SETTING:|LIGHTING:|TECHNICAL SPECS:)/g, '\n<strong class="text-indigo-400">$&</strong>');

  return (
    <div className="dark-card p-5 transition-transform transform hover:-translate-y-1 hover:shadow-xl hover:border-indigo-500/50 flex flex-col justify-between">
      <div>
        <h3 className="font-bold text-lg text-white">📸 Photo #{image.image_number}: {image.image_title}</h3>
        <p 
          className="text-gray-300 mt-3 text-sm bg-gray-900 p-3 rounded-md font-mono break-words whitespace-pre-wrap border border-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: formattedText }}
        />
      </div>
    </div>
  );
};

interface ResultsProps {
  images: ImagePrompt[];
}

const Results: React.FC<ResultsProps> = ({ images }) => {
  if (!images || images.length === 0) {
    return null;
  }

  return (
    <div className="mt-10">
      <h2 className="text-2xl font-bold text-center mb-6 text-white">Danh Sách Prompt Ảnh</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {images.map(img => (
          <ImageCard 
            key={img.image_number} 
            image={img}
          />
        ))}
      </div>
    </div>
  );
};

export default Results;
