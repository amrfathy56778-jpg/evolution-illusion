
## التغييرات المطلوبة

### 1. تسريع أنيميشن الوضع النهاري/الليلي
في `src/styles.css`:
- تقليل مدة `theme-burst` من 0.85s إلى ~0.35s.
- تقليل transition العام من 0.45s إلى 0.18s.

### 2. قائمة تلخيص المقالات (PostAIChat) فوق كل شيء + خلفية مموهة
في `src/components/PostAIChat.tsx`:
- رفع z-index الـ overlay إلى `z-[2147483600]` (أعلى من الـ header).
- زيادة `backdrop-blur-2xl` + طبقة `bg-background/40` لتقوية التمويه على ما خلف الحوار.
- التأكد من `position: fixed; inset: 0` (موجود بالفعل).
- نفس المعالجة لـ `AISearchDialog.tsx`.

### 3. شريط علوي بتمويه + إخفاؤه عند فتح بحث الذكاء الاصطناعي
في `src/components/Layout.tsx` و `src/styles.css`:
- إضافة class `site-header` للـ header مع backdrop-filter قوي.
- عند فتح AISearchDialog: إضافة `body.classList.add("ai-search-open")` و CSS:
  ```css
  body.ai-search-open header.site-header { display: none; }
  ```

### 4. قائمة التحرير عند تحديد النص فوق قائمة النظام + خيار صورة/فيديو
في `src/components/RichEditor.tsx`:
- في `FloatingToolbar` (BubbleMenu للنص):
  - إضافة أزرار: رفع صورة، رفع فيديو، صورة من رابط، يوتيوب.
  - عمل input مخفي للملفات داخل الـ FloatingToolbar.
- لرفع القائمة فوق قائمة النظام (Copy/Paste الأصلية للنظام لا يمكن إخفاؤها برمجياً، لكن يمكن منع إظهار قائمة المتصفح الافتراضية على التحديد عبر `onContextMenu` + إعطاء BubbleMenu `position: fixed` و `z-index: 2147483647`، وإضافة `transform: translateY(-12px)` لرفعها بعيداً عن منطقة التحديد). إضافة الـ class `editor-bubble-top` مع style `position: fixed !important; z-index: 2147483647 !important`.
- إضافة `InsertBar` ثانية في الأسفل (Sticky bottom) مع زر حفظ، و**نقل زر "نشر" إلى أعلى وأسفل** نموذج الإضافة في `CategoryPage.tsx`.

### 5. زر "حفظ/نشر" أعلى وأسفل
في `src/components/CategoryPage.tsx` و `src/routes/_app/guest-post.tsx`:
- إضافة زر النشر مرة أخرى أعلى الـ form (فوق RichEditor) بنفس المنطق.

### 6. أرقام الصفحات في صفحات الأقسام
الأرقام موجودة فعلاً في `Pagination` داخل `CategoryPage.tsx`. التأكد أنها تظهر دائماً (حتى لو صفحة واحدة فقط، عرض رقم 1 فقط، وإلا إخفاء). تعديل: إزالة شرط `if (pages <= 1) return null;` واستبداله بإظهار "صفحة 1 من 1".

### 7. الذكاء الاصطناعي يقرأ كل المقالات + يعتمد عليها أساساً
في `supabase/functions/post-chat/index.ts`:
- إزالة `.limit(200)` ليصبح بدون حد (أو `.limit(2000)`).
- تعديل SYSTEM prompt ليؤكد: "اعتمد بشكل أساسي وحصري على مقالات الموقع المرفقة. إذا لم تجد الإجابة في الموقع، قل ذلك صراحة قبل إضافة معلومات خارجية."
- نفس الشيء في `supabase/functions/ai-search/index.ts`: إزالة `.slice(0, 80)` و `.limit(80)` ورفعها إلى 1000.

### 8. ربط الذكاء الاصطناعي بـ Google Gemini API
- إضافة secret جديد `GEMINI_API_KEY` (سيُطلب من المستخدم بعد الموافقة).
- تعديل `post-chat`, `ai-search`, `smart-title`, `evolution-critic`, `verify-critique`, `guest-post-review` لاستخدام Gemini API مباشرة:
  - URL: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${GEMINI_API_KEY}` (للـ streaming) أو `:generateContent` للعادي.
  - تحويل تنسيق الرسائل من OpenAI format إلى Gemini format (`contents: [{role, parts:[{text}]}]`).
  - الاحتفاظ بـ Lovable AI كـ fallback في حال عدم وجود `GEMINI_API_KEY`.

### الملفات المعدّلة
- `src/styles.css` — سرعة الأنيميشن، z-index الحوارات، إخفاء الهيدر عند البحث.
- `src/components/Layout.tsx` — class للهيدر، backdrop-blur.
- `src/components/PostAIChat.tsx` — z-index أعلى، تمويه أقوى.
- `src/components/AISearchDialog.tsx` — z-index، إشارة لإخفاء الهيدر.
- `src/components/RichEditor.tsx` — أزرار صورة/فيديو في BubbleMenu، رفع z-index.
- `src/components/CategoryPage.tsx` — زر نشر أعلى وأسفل، إظهار رقم الصفحة دائماً.
- `src/routes/_app/guest-post.tsx` — زر إرسال أعلى وأسفل.
- `supabase/functions/post-chat/index.ts` — إزالة الحد، تعديل system prompt، دعم Gemini.
- `supabase/functions/ai-search/index.ts` — إزالة الحد، دعم Gemini.
- `supabase/functions/smart-title/index.ts` — دعم Gemini.

### المفاتيح السرية
بعد الموافقة على الخطة، سأطلب منك إضافة `GEMINI_API_KEY` (احصل عليه مجاناً من https://aistudio.google.com/apikey).
