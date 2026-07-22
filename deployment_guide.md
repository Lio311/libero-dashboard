# מדריך העלאה לאוויר ב-Vercel (Vercel Deployment Guide)

המדריך הזה מסביר צעד-אחר-צעד איך להעלות את הפרויקט ל-**Vercel** ולחבר את משתני הסביבה (Environment Variables).

---

## שלב 1: העלאת הקוד ל-GitHub

אם הפרויקט כבר מחובר ל-GitHub:
1. ודא שכל השינויים דחופים (push) ל- repository שלך ב-GitHub.

---

## שלב 2: יצירת פרויקט חדש ב-Vercel

1. היכנס ל-[Vercel Dashboard](https://vercel.com/dashboard).
2. לחץ על **Add New...** -> **Project**.
3. בחר את ה-Repository של הפרויקט מ-GitHub ולחץ **Import**.

---

## שלב 3: הגדרת משתני סביבה (Environment Variables) ב-Vercel

במסך ההגדרה לפני ה-Deploy (או תחת **Settings -> Environment Variables**):

הוסף את המשתנים הבאים:

| Key | הערה / מקור |
|---|---|
| `VITE_SUPABASE_URL` | כתובת Supabase מהקובץ `.env` |
| `VITE_SUPABASE_ANON_KEY` | מפתח Supabase מהקובץ `.env` |
| `VITE_GEMINI_API_KEY` | מפתח Gemini API |
| `NEON_DATABASE_URL` | מחרוזת התחברות ל-Neon PostgreSQL |
| `LIBERO_WC_CK` | מפתח Consumer Key של WooCommerce (Libero) |
| `LIBERO_WC_CS` | מפתח Consumer Secret של WooCommerce (Libero) |
| `LABURA_WC_CK` | מפתח Consumer Key של WooCommerce (La Burro) |
| `LABURA_WC_CS` | מפתח Consumer Secret של WooCommerce (La Burro) |
| `VELOUR_WC_CK` | מפתח Consumer Key של WooCommerce (Velour) |
| `VELOUR_WC_CS` | מפתח Consumer Secret של WooCommerce (Velour) |

---

## שלב 4: הרצת Deployment

1. לחץ על **Deploy**.
2. Vercel יבצע `npm run build` אוטומטית ויקים את ה-Serverless Functions שנמצאות בתיקיית `api/`.
3. בסיום, תבלע כתובת אתר פעילה (לדוגמה `https://your-project.vercel.app`).

---

## הרצה מקומית עם Vercel CLI (פיתוח מקומי)

להרצת האתר וה-API באופן מקומי:
```bash
npx vercel dev
```
פקודה זו מריצה גם את הפרונטאנד וגם את פונקציות ה-API בתיקיית `api/` במקביל בכתובת `http://localhost:3000`.
