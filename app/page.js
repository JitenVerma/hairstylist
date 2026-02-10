"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const STYLE_TILES = {
  hairstyles: [
    "Low Fade",
    "Textured Crop",
    "Classic Pompadour",
    "Buzz Cut",
    "Shoulder Waves",
    "Curly Fringe",
    "Slick Back",
    "Undercut"
  ],
  beards: [
    "Clean Shave",
    "Light Stubble",
    "Short Boxed",
    "Goatee",
    "Full Beard",
    "Balbo",
    "Van Dyke",
    "Mustache Focus"
  ]
};

const FLOATING_STYLES = [
  {
    src: "https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=700&q=80",
    alt: "Man with styled haircut",
    className: "float-card card-a"
  },
  {
    src: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=700&q=80",
    alt: "Person with long textured hair",
    className: "float-card card-b"
  },
  {
    src: "https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=700&q=80",
    alt: "Person with beard and short hairstyle",
    className: "float-card card-c"
  },
  {
    src: "https://images.unsplash.com/photo-1542178243-bc20204b769f?auto=format&fit=crop&w=700&q=80",
    alt: "Close up portrait with curly hairstyle",
    className: "float-card card-d"
  }
];

function UploadTile({ label, keyName, fileData, onFileUpload, onRemoveUpload }) {
  const [isActive, setIsActive] = useState(false);

  const handleDrop = (event) => {
    event.preventDefault();
    setIsActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      onFileUpload(keyName, file);
    }
  };

  const handleInputChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(keyName, file);
    }
  };

  return (
    <div className="upload-tile-wrap">
      <p className="upload-label">{label}</p>
      <label
        className={`upload-tile ${isActive ? "active" : ""}`}
        onDragEnter={(e) => {
          e.preventDefault();
          setIsActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsActive(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          className="sr-only"
          type="file"
          accept="image/*"
          onChange={handleInputChange}
        />
        {!fileData?.previewUrl ? (
          <div className="upload-placeholder">
            <span>Drag image here</span>
            <span>or click to upload</span>
          </div>
        ) : (
          <div className="preview-wrap">
            <button
              type="button"
              className="remove-upload-btn"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onRemoveUpload(keyName);
              }}
              aria-label={`Remove ${label} image`}
            >
              x
            </button>
            <img src={fileData.previewUrl} alt={`${label} preview`} />
            <span className="file-name">{fileData.file.name}</span>
          </div>
        )}
      </label>
    </div>
  );
}

function StyleOptions({ title, options, selected, onSelect }) {
  return (
    <section className="style-section">
      <h3>{title}</h3>
      <div className="chip-grid">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={selected === option ? "chip selected" : "chip"}
            onClick={() => onSelect(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const [started, setStarted] = useState(false);
  const [profileImages, setProfileImages] = useState({
    front: null,
    side: null,
    rear: null
  });
  const [selectedHair, setSelectedHair] = useState("");
  const [selectedBeard, setSelectedBeard] = useState("");
  const [customStyle, setCustomStyle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [generatedPreview, setGeneratedPreview] = useState(null);
  const [modelMessage, setModelMessage] = useState("");
  const latestProfilesRef = useRef(profileImages);

  const hasAllImages = useMemo(
    () => Boolean(profileImages.front && profileImages.side && profileImages.rear),
    [profileImages]
  );

  const updateImage = (position, file) => {
    setProfileImages((prev) => {
      const oldPreview = prev[position]?.previewUrl;
      if (oldPreview) {
        URL.revokeObjectURL(oldPreview);
      }
      return {
        ...prev,
        [position]: {
          file,
          previewUrl: URL.createObjectURL(file)
        }
      };
    });
  };

  const removeImage = (position) => {
    setProfileImages((prev) => {
      const oldPreview = prev[position]?.previewUrl;
      if (oldPreview) {
        URL.revokeObjectURL(oldPreview);
      }
      return {
        ...prev,
        [position]: null
      };
    });
  };

  const handleGeneratePreview = async () => {
    if (!hasAllImages || isGenerating) {
      return;
    }

    setIsGenerating(true);
    setGenerationError("");
    setGeneratedPreview(null);
    setModelMessage("");

    try {
      const formData = new FormData();
      formData.append("front", profileImages.front.file);
      formData.append("side", profileImages.side.file);
      formData.append("rear", profileImages.rear.file);
      formData.append("selectedHair", selectedHair);
      formData.append("selectedBeard", selectedBeard);
      formData.append("customStyle", customStyle);

      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to generate preview.");
      }

      if (!payload.imageData || !payload.mimeType) {
        throw new Error("No image was returned by the model.");
      }

      setGeneratedPreview(`data:${payload.mimeType};base64,${payload.imageData}`);
      setModelMessage(payload.text || "");
    } catch (error) {
      setGenerationError(error.message || "Failed to generate preview.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    latestProfilesRef.current = profileImages;
  }, [profileImages]);

  useEffect(() => {
    return () => {
      Object.values(latestProfilesRef.current).forEach((item) => {
        if (item?.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  return (
    <main className="page-root">
      <div className="floating-gallery" aria-hidden="true">
        {FLOATING_STYLES.map((card) => (
          <figure className={card.className} key={card.src}>
            <img src={card.src} alt={card.alt} />
          </figure>
        ))}
      </div>

      <section className="hero">
        <p className="hero-kicker">LOOKSHIFT</p>
        <h1>Try your next look before you commit.</h1>
        <p className="hero-copy">
          Upload your front, side, and rear profile, then preview hairstyle and
          beard ideas made for your face angles. Discover your best look, or
          test something bold in seconds.
        </p>
        <button type="button" className="cta-btn" onClick={() => setStarted(true)}>
          Get Started
        </button>
      </section>

      {started && (
        <section className="app-panel">
          <h2>Step 1: Upload Your 3 Profile Photos</h2>
          <p className="instructions">
            Use clear front, side, and rear photos in good lighting. Your uploads
            stay in your browser session and are not stored.
          </p>

          <div className="upload-grid">
            <UploadTile
              label="Front Profile"
              keyName="front"
              fileData={profileImages.front}
              onFileUpload={updateImage}
              onRemoveUpload={removeImage}
            />
            <UploadTile
              label="Side Profile"
              keyName="side"
              fileData={profileImages.side}
              onFileUpload={updateImage}
              onRemoveUpload={removeImage}
            />
            <UploadTile
              label="Rear Profile"
              keyName="rear"
              fileData={profileImages.rear}
              onFileUpload={updateImage}
              onRemoveUpload={removeImage}
            />
          </div>

          <h2>Step 2: Choose Looks To Try</h2>
          <StyleOptions
            title="Hairstyles"
            options={STYLE_TILES.hairstyles}
            selected={selectedHair}
            onSelect={setSelectedHair}
          />
          <StyleOptions
            title="Beard Styles"
            options={STYLE_TILES.beards}
            selected={selectedBeard}
            onSelect={setSelectedBeard}
          />

          <section className="style-section">
            <h3>Custom Style Prompt</h3>
            <input
              className="custom-input"
              type="text"
              value={customStyle}
              onChange={(e) => setCustomStyle(e.target.value)}
              placeholder="Example: medium taper fade with sharp lineup and short boxed beard"
            />
          </section>

          <button
            type="button"
            className="primary-action"
            disabled={!hasAllImages || isGenerating}
            aria-disabled={!hasAllImages || isGenerating}
            onClick={handleGeneratePreview}
          >
            {isGenerating ? "Generating..." : "Generate Preview"}
          </button>

          {generationError && <p className="generation-error">{generationError}</p>}

          {generatedPreview && (
            <section className="result-panel">
              <h2>Generated Preview</h2>
              <img src={generatedPreview} alt="Generated hairstyle preview" />
              {modelMessage && <p className="model-message">{modelMessage}</p>}
            </section>
          )}
        </section>
      )}
    </main>
  );
}
