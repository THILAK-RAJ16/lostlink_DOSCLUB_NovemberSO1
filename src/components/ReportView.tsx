import React, { useState } from 'react';
import { User, Category } from '../types';
import { Upload, X, ArrowLeft, Image as ImageIcon, Sparkles, CheckCircle2 } from 'lucide-react';

interface ReportViewProps {
  type: 'LOST' | 'FOUND';
  user: User | null;
  categories: Category[];
  onBack: () => void;
  onSuccess: (itemId: number) => void;
  onOpenAuth: () => void;
  api: any;
  onToast: (msg: string, isError?: boolean) => void;
}

export const ReportView: React.FC<ReportViewProps> = ({
  type,
  user,
  categories,
  onBack,
  onSuccess,
  onOpenAuth,
  api,
  onToast,
}) => {
  const isLost = type === 'LOST';
  const todayStr = new Date().toISOString().split('T')[0];

  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[0]?.name || 'Electronics');
  const [date, setDate] = useState(todayStr);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [identifyingFeatures, setIdentifyingFeatures] = useState('');
  const [contactInfo, setContactInfo] = useState(user?.phone || user?.email || '');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Handle file select
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      onToast('Please upload a valid image file (JPG, PNG, or WebP).', true);
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      onToast('Image size exceeds 8MB limit.', true);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onToast('Please log in to submit a report.', true);
      onOpenAuth();
      return;
    }

    if (!name.trim() || !location.trim() || !description.trim()) {
      onToast('Please fill in all required fields.', true);
      return;
    }

    setSubmitting(true);
    try {
      let finalImageUrl = '';

      // Upload image if selected
      if (imagePreview) {
        setUploading(true);
        try {
          const uploadRes = await api.uploadImage(imagePreview, `${type.toLowerCase()}_${Date.now()}.jpg`);
          if (uploadRes.url) {
            finalImageUrl = uploadRes.url;
          }
        } catch (uploadErr) {
          console.warn('Image upload failed, proceeding with preview or empty:', uploadErr);
        } finally {
          setUploading(false);
        }
      }

      const res = await api.createItem({
        type,
        name: name.trim(),
        category,
        description: description.trim(),
        location: location.trim(),
        item_date: date,
        image_url: finalImageUrl,
        identifying_features: identifyingFeatures.trim(),
        contact_info: contactInfo.trim() || user.email,
      });

      if (res.error) {
        onToast(res.error, true);
      } else {
        onToast(
          isLost
            ? 'Lost item report published! Our smart matching engine has scanned recent found items.'
            : 'Found item report published! Thank you for helping return lost belongings.'
        );
        onSuccess(res.item?.id || 0);
      }
    } catch (err: any) {
      onToast(err.message || 'Failed to submit report.', true);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="py-16 px-4 max-w-md mx-auto text-center min-h-[calc(100vh-64px)] flex flex-col justify-center">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mx-auto mb-4 text-xl">
            🔒
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Authentication Required
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            You need a verified account to file a {isLost ? 'lost' : 'found'} report and receive real-time match alerts.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onBack}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl"
            >
              Back
            </button>
            <button
              onClick={onOpenAuth}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
            >
              Log in / Register
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 bg-slate-50/60 dark:bg-slate-950/60 min-h-[calc(100vh-64px)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Navigation Breadcrumb */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to previous page</span>
        </button>

        {/* Form Container */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          
          <div className="border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
            <span
              className={`inline-block px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider mb-2 ${
                isLost
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                  : 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400'
              }`}
            >
              {isLost ? 'Report Lost Belonging' : 'Report Found Belonging'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {isLost ? 'Tell us what you lost' : 'List an item you found'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {isLost
                ? 'Provide accurate descriptive features and location. Our matching algorithm automatically cross-checks newly submitted found items.'
                : 'Help reunite this item with its rightful owner. To safeguard security, private identifying marks will remain hidden in the public listing.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* 1. Item Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                Item Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isLost ? "e.g. Black Dell Inspiron laptop bag" : "e.g. Set of car keys with blue leather lanyard"}
                required
                maxLength={90}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 2. Category & Date Split */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  {isLost ? 'Date Lost' : 'Date Found'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  max={todayStr}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 3. Location */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                {isLost ? 'Lost Location' : 'Found Location'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Metro Station Platform 4, Civic Center parking, Downtown Cafe"
                required
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 4. Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                Public Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  isLost
                    ? 'Describe color, size, brand, external features, and what happened...'
                    : 'Describe general color, material, and where it was left. (Do NOT include private serials or codes here).'
                }
                required
                minLength={10}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 5. Identifying Features */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                {isLost
                  ? 'Distinctive Identifying Features (for verification)'
                  : 'Private Identifying Details (Confidential — Stays Hidden)'}
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isLost
                  ? 'Include unique stickers, scratches, lock-screen photos, or interior contents that can be verified against a found item.'
                  : 'Specify details only the true owner would know (e.g. serial numbers, specific cards inside wallet, lock-screen wallpaper). This will NEVER be shown in public listings.'}
              </p>
              <textarea
                rows={2}
                value={identifyingFeatures}
                onChange={(e) => setIdentifyingFeatures(e.target.value)}
                placeholder="e.g. Sticker inside reads 'Fix-It 2024', student transit pass ending in 904..."
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 6. Contact Information (for lost reports) */}
            {isLost && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Contact Information (Optional)
                </label>
                <input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="Phone number or alternate email for the finder to contact you"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* 7. Image Upload Box */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                Item Photo (JPG, PNG, or WebP)
              </label>
              
              {imagePreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-[16/9] max-h-60 bg-slate-100 dark:bg-slate-800 group">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImagePreview(null)}
                    className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-slate-900 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 dark:bg-slate-800/30 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Click or drag photo here to upload
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">
                    Up to 8MB in JPG, PNG, or WebP format
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Submit Action */}
            <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || uploading}
                className={`inline-flex items-center gap-2 px-6 py-3 font-bold text-xs text-white rounded-xl shadow-md transition-all ${
                  isLost
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-teal-600 hover:bg-teal-700'
                } disabled:opacity-50`}
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {uploading
                    ? 'Uploading image...'
                    : submitting
                    ? 'Publishing report...'
                    : isLost
                    ? 'Submit Lost Report'
                    : 'Submit Found Report'}
                </span>
              </button>
            </div>

          </form>

        </div>
      </div>
    </div>
  );
};
