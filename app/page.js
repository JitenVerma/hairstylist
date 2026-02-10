"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const MB = 1024 * 1024;
const VERCEL_MULTIPART_LIMIT_BYTES = 4.5 * MB;
const TARGET_TOTAL_UPLOAD_BYTES = 4.2 * MB;
const TARGET_FILE_BYTES = 1.3 * MB;
const MAX_IMAGE_DIMENSION = 1800;

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

function formatBytes(bytes) {
  return `${(bytes / MB).toFixed(2)} MB`;
}

function fileNameWithoutExtension(name) {
  return name.replace(/\.[^/.]+$/, "");
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("Image compression failed."));
      },
      mimeType,
      quality
    );
  });
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new Error("Could not read this image. Please choose a JPG, PNG, or WEBP file.")
      );
    };
    image.src = objectUrl;
  });
}

async function compressImageForUpload(file) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload image files only.");
  }

  const image = await loadImageFromFile(file);
  const originalWidth = image.naturalWidth || image.width;
  const originalHeight = image.naturalHeight || image.height;
  const largestEdge = Math.max(originalWidth, originalHeight);
  const maxScale = largestEdge > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / largestEdge : 1;
  const baseWidth = Math.max(320, Math.round(originalWidth * maxScale));
  const baseHeight = Math.max(320, Math.round(originalHeight * maxScale));

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not initialize image compression.");
  }

  const qualitySteps = [0.86, 0.78, 0.7, 0.62, 0.54, 0.46, 0.38];
  let smallestBlob = null;

  for (let resizeStep = 0; resizeStep < 4; resizeStep += 1) {
    const sizeScale = Math.pow(0.85, resizeStep);
    const width = Math.max(320, Math.round(baseWidth * sizeScale));
    const height = Math.max(320, Math.round(baseHeight * sizeScale));
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    for (const quality of qualitySteps) {
      const blob = await canvasToBlob(canvas, "image/jpeg", quality);
      if (!smallestBlob || blob.size < smallestBlob.size) {
        smallestBlob = blob;
      }

      if (blob.size <= TARGET_FILE_BYTES) {
        const baseName = fileNameWithoutExtension(file.name) || "profile";
        return new File([blob], `${baseName}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now()
        });
      }
    }
  }

  if (!smallestBlob) {
    throw new Error("Could not compress this image.");
  }

  const baseName = fileNameWithoutExtension(file.name) || "profile";
  return new File([smallestBlob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now()
  });
}

function UploadTile({
  label,
  keyName,
  fileData,
  onFileUpload,
  onRemoveUpload,
  isCompressing
}) {
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
    event.target.value = "";
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
            {isCompressing ? (
              <>
                <span>Compressing image...</span>
                <span>Please wait</span>
              </>
            ) : (
              <>
                <span>Drag image here</span>
                <span>or click to upload</span>
              </>
            )}
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
            <span className="file-name">
              {fileData.file.name} ({formatBytes(fileData.file.size)})
            </span>
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

function BananaLoader() {
  return (
    <div className="banana-loader" role="status" aria-live="polite">
      <div className="banana-loader-row" aria-hidden="true">
        <span className="banana-shape b1" />
        <span className="banana-shape b2" />
        <span className="banana-shape b3" />
      </div>
      <p className="banana-loader-title">Brewing your banana blend...</p>
      <p className="banana-loader-copy">
        Matching angles and styling your new look.
      </p>
    </div>
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
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressingKey, setCompressingKey] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [generationError, setGenerationError] = useState("");
  const [generatedPreview, setGeneratedPreview] = useState(null);
  const [modelMessage, setModelMessage] = useState("");
  const latestProfilesRef = useRef(profileImages);

  const hasAllImages = useMemo(
    () => Boolean(profileImages.front && profileImages.side && profileImages.rear),
    [profileImages]
  );

  const totalUploadBytes = useMemo(
    () =>
      Object.values(profileImages).reduce((sum, value) => {
        return sum + (value?.file?.size || 0);
      }, 0),
    [profileImages]
  );

  const exceedsUploadTarget = totalUploadBytes > TARGET_TOTAL_UPLOAD_BYTES;
  const canGenerate =
    hasAllImages && !isGenerating && !isCompressing && !exceedsUploadTarget;

  const updateImage = async (position, file) => {
    setUploadError("");
    setCompressingKey(position);
    setIsCompressing(true);
    try {
      const compressedFile = await compressImageForUpload(file);
      setProfileImages((prev) => {
        const oldPreview = prev[position]?.previewUrl;
        if (oldPreview) {
          URL.revokeObjectURL(oldPreview);
        }
        return {
          ...prev,
          [position]: {
            file: compressedFile,
            previewUrl: URL.createObjectURL(compressedFile)
          }
        };
      });
    } catch (error) {
      setUploadError(error.message || "Could not process this image.");
    } finally {
      setIsCompressing(false);
      setCompressingKey("");
    }
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
    if (!hasAllImages || isGenerating || isCompressing) {
      return;
    }

    if (totalUploadBytes > VERCEL_MULTIPART_LIMIT_BYTES) {
      setGenerationError(
        `Combined image size is ${formatBytes(
          totalUploadBytes
        )}. Please keep uploads under ${formatBytes(TARGET_TOTAL_UPLOAD_BYTES)}.`
      );
      return;
    }

    setIsGenerating(true);
    setUploadError("");
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
              isCompressing={isCompressing && compressingKey === "front"}
            />
            <UploadTile
              label="Side Profile"
              keyName="side"
              fileData={profileImages.side}
              onFileUpload={updateImage}
              onRemoveUpload={removeImage}
              isCompressing={isCompressing && compressingKey === "side"}
            />
            <UploadTile
              label="Rear Profile"
              keyName="rear"
              fileData={profileImages.rear}
              onFileUpload={updateImage}
              onRemoveUpload={removeImage}
              isCompressing={isCompressing && compressingKey === "rear"}
            />
          </div>
          <div className="upload-size-meta">
            <p className={exceedsUploadTarget ? "size-line warning" : "size-line"}>
              Total upload size: {formatBytes(totalUploadBytes)} /{" "}
              {formatBytes(TARGET_TOTAL_UPLOAD_BYTES)} target
            </p>
            <p className="size-hint">
              Photos are auto-compressed to stay under Vercel&apos;s{" "}
              {formatBytes(VERCEL_MULTIPART_LIMIT_BYTES)} request limit.
            </p>
          </div>
          {uploadError && <p className="generation-error">{uploadError}</p>}

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
            disabled={!canGenerate}
            aria-disabled={!canGenerate}
            onClick={handleGeneratePreview}
          >
            {isCompressing
              ? "Preparing Images..."
              : isGenerating
                ? "Generating with Banana AI..."
                : "Generate Preview"}
          </button>

          {generationError && <p className="generation-error">{generationError}</p>}

          {isGenerating && <BananaLoader />}

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
