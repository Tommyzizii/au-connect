"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";

import { ProfilePicCrop } from "@/types/ProfilePicCrop";
import { getCroppedAvatarFile } from "../utils/cropImage";

type Props = {
    open: boolean;
    imageUrl: string | null;
    initialCrop: ProfilePicCrop | null;
    busy: boolean;
    onCancel: () => void;
    onSave: (result: { croppedFile: File; profilePicCrop: ProfilePicCrop }) => void;
};

export default function ProfilePhotoCropModal({
    open,
    imageUrl,
    initialCrop,
    busy,
    onCancel,
    onSave,
}: Props) {
    const [crop, setCrop] = useState<{ x: number; y: number }>(
        initialCrop?.crop ?? { x: 0, y: 0 }
    );
    const [zoom, setZoom] = useState<number>(initialCrop?.zoom ?? 1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<
        { x: number; y: number; width: number; height: number } | null
    >(initialCrop?.croppedAreaPixels ?? null);

    useEffect(() => {
        if (!open) return;
        setCrop(initialCrop?.crop ?? { x: 0, y: 0 });
        setZoom(initialCrop?.zoom ?? 1);
        setCroppedAreaPixels(initialCrop?.croppedAreaPixels ?? null);
    }, [open, initialCrop]);

    const onCropComplete = useCallback((_: any, croppedPixels: any) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    if (!open || !imageUrl) return null;

    async function handleSave() {
        if (!croppedAreaPixels || !imageUrl) return;

        const profilePicCrop: ProfilePicCrop = {
            crop,
            zoom,
            croppedAreaPixels,
        };

        const croppedFile = await getCroppedAvatarFile(
            imageUrl, 
            croppedAreaPixels,
            512
        );

        onSave({ croppedFile, profilePicCrop });
    }


    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={onCancel} />

            <div className="relative z-10 w-full max-w-3xl bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="px-4 py-3 border-b flex items-center justify-between">
                    <div className="font-semibold text-gray-900">Edit photo</div>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={busy}
                        className="text-gray-600 hover:text-gray-900 disabled:opacity-50 cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                <div className="grid grid-cols-12">
                    {/* LEFT: CROPPER */}
                    <div className="col-span-12 md:col-span-8 bg-gray-100">
                        <div className="relative h-[420px]">
                            <Cropper
                                image={imageUrl}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                cropShape="round"
                                showGrid={false}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                            />
                        </div>
                    </div>

                    {/* RIGHT: CONTROLS */}
                    <div className="col-span-12 md:col-span-4 p-4">
                        <div className="text-sm font-medium text-gray-900 mb-2">Zoom</div>
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.01}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-full"
                            disabled={busy}
                        />

                        <div className="mt-6 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={busy}
                                className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={busy || !croppedAreaPixels}
                                className="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                            >
                                Save photo
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
