"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { createClient } from "@/lib/supabase/client";
import { ngnToKobo } from "@/lib/utils/format";
import styles from "./ListingForm.module.css";

const CATEGORIES = [
  "Business Strategy",
  "Marketing",
  "Finance",
  "Legal",
  "Technology",
  "Operations",
  "HR",
  "Other",
] as const;

const DURATIONS = [30, 60, 90, 120] as const;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const IMAGE_ERROR_MESSAGE = "Please upload a JPG, PNG, or WebP image under 5MB.";

interface ListingFormProps {
  consultantId: string;
}

export function ListingForm({ consultantId }: ListingFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [consultationType, setConsultationType] = useState<"physical" | "virtual" | "both">(
    "physical"
  );
  const [location, setLocation] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageError, setImageError] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;

    if (!nextFile) {
      setImageFile(null);
      setImagePreview("");
      setImageError("");
      return;
    }

    if (!IMAGE_TYPES.includes(nextFile.type) || nextFile.size > 5 * 1024 * 1024) {
      setImageFile(null);
      setImagePreview("");
      setImageError(IMAGE_ERROR_MESSAGE);
      return;
    }

    setImageFile(nextFile);
    setImagePreview(URL.createObjectURL(nextFile));
    setImageError("");
  }

  function validateForm() {
    const nextErrors: Record<string, string> = {};

    if (!title.trim()) {
      nextErrors.title = "Please add a listing title.";
    }

    if (description.trim().length < 100) {
      nextErrors.description = "Description must be at least 100 characters.";
    }

    if (!price || Number(price) <= 0) {
      nextErrors.price = "Please enter a valid price in NGN.";
    }

    if (!location.trim()) {
      nextErrors.location = "Please enter a location.";
    }

    if (!imageFile) {
      nextErrors.image = IMAGE_ERROR_MESSAGE;
      setImageError(IMAGE_ERROR_MESSAGE);
    }

    setErrors(nextErrors);
    setFormError(Object.keys(nextErrors).length > 0 ? "Please fix the highlighted fields." : "");

    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm() || !imageFile) {
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(15);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const listingId = crypto.randomUUID();
      const sanitizedFileName = imageFile.name.replace(/\s+/g, "-").toLowerCase();
      const filePath = `${consultantId}/${listingId}/${sanitizedFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(filePath, imageFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error(uploadError);
        setFormError("Something went wrong. Please try again.");
        return;
      }

      setUploadProgress(70);

      const { data: publicUrlData } = supabase.storage
        .from("listing-images")
        .getPublicUrl(filePath);

      const { error: listingError } = await supabase.from("listings").insert({
        id: listingId,
        consultant_id: consultantId,
        title: title.trim(),
        category,
        consultation_type: consultationType,
        description: description.trim(),
        duration_minutes: durationMinutes,
        featured_image_url: publicUrlData.publicUrl,
        location: location.trim(),
        price: ngnToKobo(Number(price)),
        status: "pending",
      });

      if (listingError) {
        console.error(listingError);
        setFormError("Something went wrong. Please try again.");
        return;
      }

      await supabase.from("profiles").update({ role: "consultant" }).eq("id", user.id);

      setUploadProgress(100);
      router.push("/consultant/listings?created=1");
      router.refresh();
    } catch (error) {
      console.error(error);
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.grid}>
        <Input
          error={errors.title}
          label="Title"
          name="title"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Growth Strategy Session for SMEs"
          value={title}
        />

        <label className={styles.field}>
          <span className={styles.label}>Category</span>
          <select
            className={styles.select}
            onChange={(event) => setCategory(event.target.value)}
            value={category}
          >
            {CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.fullWidth}>
          <Input
            error={errors.description}
            label="Description"
            multiline
            name="description"
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe the value clients will get from this consultation."
            value={description}
          />
        </div>

        <Input
          error={errors.price}
          label="Price (NGN)"
          min="0"
          name="price"
          onChange={(event) => setPrice(event.target.value)}
          placeholder="5000"
          type="number"
          value={price}
        />

        <Input
          error={errors.location}
          label="Location"
          name="location"
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Lagos, Nigeria"
          value={location}
        />

        <label className={styles.field}>
          <span className={styles.label}>Duration</span>
          <select
            className={styles.select}
            onChange={(event) => setDurationMinutes(Number(event.target.value))}
            value={durationMinutes}
          >
            {DURATIONS.map((option) => (
              <option key={option} value={option}>
                {option} min
              </option>
            ))}
          </select>
        </label>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Consultation type</legend>
          <label className={styles.radioOption}>
            <input
              checked={consultationType === "physical"}
              name="consultationType"
              onChange={() => setConsultationType("physical")}
              type="radio"
            />
            <span>Physical</span>
          </label>
          <label className={styles.radioOption}>
            <input
              checked={consultationType === "virtual"}
              name="consultationType"
              onChange={() => setConsultationType("virtual")}
              type="radio"
            />
            <span>Virtual</span>
          </label>
          <label className={styles.radioOption}>
            <input
              checked={consultationType === "both"}
              name="consultationType"
              onChange={() => setConsultationType("both")}
              type="radio"
            />
            <span>Both</span>
          </label>
        </fieldset>
      </div>

      <div className={styles.uploadSection}>
        <div className={styles.uploadHeader}>
          <h2 className={styles.uploadTitle}>Featured image</h2>
          <p className={styles.uploadCopy}>Upload a JPG, PNG, or WebP image under 5MB.</p>
        </div>

        <label className={styles.uploadBox}>
          <input accept=".jpg,.jpeg,.png,.webp" onChange={handleImageChange} type="file" />
          <span>Choose image</span>
        </label>

        {imagePreview ? (
          <div className={styles.previewWrapper}>
            <img alt="Listing preview" className={styles.previewImage} src={imagePreview} />
          </div>
        ) : null}

        {imageError ? <p className={styles.errorText}>{imageError}</p> : null}

        {isSubmitting ? (
          <div className={styles.progressWrapper}>
            <div className={styles.progressTrack}>
              <div className={styles.progressBar} style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className={styles.progressLabel}>Uploading image and saving listing...</p>
          </div>
        ) : null}
      </div>

      {formError ? <p className={styles.errorText}>{formError}</p> : null}

      <div className={styles.actions}>
        <Button loading={isSubmitting} size="lg" type="submit">
          Submit Listing
        </Button>
      </div>
    </form>
  );
}
