## المشكلة

عند تغيير لغة الموقع تظهر قائمة Google Translate العلوية ("تمت الترجمة / خيارات / إظهار الأصل") وتغطّي الشريط العلوي للموقع. كذلك يجب الحفاظ على آخر لغة اختارها المستخدم.

## الحل

### 1. إخفاء شريط Google Translate نهائياً (`src/styles.css`)

إضافة قواعد CSS قوية بـ `!important` تخفي كل عناصر شريط الترجمة بصرف النظر عن وقت حقنها من Google:

```css
.goog-te-banner-frame,
iframe.goog-te-banner-frame,
.goog-te-banner-frame.skiptranslate,
.skiptranslate iframe,
#goog-gt-tt,
.goog-tooltip,
.goog-tooltip:hover,
.goog-text-highlight {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
body { top: 0 !important; position: static !important; }
html { top: 0 !important; }
.skiptranslate > iframe { display: none !important; }
```

هذه القواعد تعمل فوراً عند تحميل الصفحة قبل أن يحقن Google البانر.

### 2. تقوية مراقب الـ DOM (`src/components/Layout.tsx`)

تحديث دالة `strip()` داخل `googleTranslateElementInit` لتزيل كل أشكال البانر:

- إزالة كل `iframe.skiptranslate` و `.goog-te-banner-frame`
- إعادة تعيين `body.style.top = "0"` و `body.style.position = "static"`
- إزالة أي `<div>` بـ `class="skiptranslate"` ظاهر في أعلى الصفحة
- تشغيل المراقب بشكل مستمر (موجود حالياً) مع إضافة فحص دوري كل 500ms كاحتياط إضافي لمدة 5 ثوانٍ بعد التحميل

### 3. الحفاظ على آخر لغة مُختارة

الكوكي `googtrans` هو ما يحدد اللغة عند إعادة التحميل، وهو محفوظ بالفعل. سأضيف:

- حفظ نسخة في `localStorage` تحت مفتاح `siteLang` عند الاختيار في `setLang(code)`.
- عند تحميل الصفحة في `TranslateButton` وفي `Layout`: قراءة `siteLang` من localStorage وإن لم يوجد كوكي `googtrans` مطابق، إعادة تعيينه قبل تحميل سكربت Google. هذا يضمن استمرار اللغة حتى لو مسح المتصفح الكوكي.
- تحديث حالة `current` فوراً من المصدرين معاً.

### 4. تحقق

- التبديل بين عدة لغات والتأكد من اختفاء شريط Google تماماً.
- إعادة تحميل الصفحة والتأكد من بقاء اللغة المختارة.
- التأكد أن الشريط العلوي للموقع (الشعار + الأزرار) لم يعد مغطى.

## الملفات المتأثرة

- `src/styles.css` — قواعد إخفاء شاملة لعناصر Google Translate.
- `src/components/Layout.tsx` — تقوية `strip()`، حفظ `siteLang` في localStorage، استرجاعه عند الإقلاع.
