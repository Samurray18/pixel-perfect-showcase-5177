import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "fr" | "ar";

const dict = {
  fr: {
    home: "Accueil", catalog: "Catalogue", track: "Suivre ma commande", gaming: "Gaming", entertainment: "Divertissement", all: "Tout",
    heroTitle: "Cartes cadeaux & recharges jeux.", heroAccent: "Livrées instantanément en Algérie.",
    heroSub: "Steam, PUBG UC, PSN, Xbox, Netflix, Spotify — payez en DZD avec Edahabia ou CIB et recevez votre code en quelques secondes.",
    shopNow: "Acheter maintenant", featured: "Les plus demandés", instant: "Livraison instantanée", secure: "Paiement sécurisé (Edahabia & CIB)", support: "Support 24/7",
    from: "À partir de", buyNow: "Acheter maintenant", chooseDenom: "Choisissez un montant", outOfStock: "Rupture de stock",
    sort: "Trier", popular: "Popularité", priceAsc: "Prix croissant", priceDesc: "Prix décroissant", brand: "Marque", maxPrice: "Prix max",
    checkout: "Paiement", fullName: "Nom complet", email: "Email", phone: "Téléphone", payMethod: "Moyen de paiement", summary: "Récapitulatif", total: "Total", payNow: "Payer maintenant",
    orderNo: "N° de commande", status: "Statut", yourCode: "Votre code", copy: "Copier", copied: "Copié !",
    paid: "Payée", pending: "En attente", fulfilled: "Livrée", failed: "Échec",
    orderThanks: "Merci pour votre commande !", waitingPay: "En attente de confirmation du paiement…", waitingCode: "Paiement confirmé. Préparation de votre code…",
    trackSub: "Entrez votre numéro de commande et votre email.", find: "Rechercher", notFound: "Commande introuvable.",
    codeEmailed: "Le code a aussi été envoyé à votre email.", simulate: "Simuler le paiement (mode test)",
  },
  ar: {
    home: "الرئيسية", catalog: "المتجر", track: "تتبع طلبي", gaming: "ألعاب", entertainment: "ترفيه", all: "الكل",
    heroTitle: "بطاقات الهدايا وشحن الألعاب.", heroAccent: "تسليم فوري في الجزائر.",
    heroSub: "ستيم، شدات ببجي، بلايستيشن، إكس بوكس، نتفليكس، سبوتيفاي — ادفع بالدينار عبر الذهبية أو CIB واستلم كودك في ثوانٍ.",
    shopNow: "تسوق الآن", featured: "الأكثر طلباً", instant: "تسليم فوري", secure: "دفع آمن (الذهبية و CIB)", support: "دعم 24/7",
    from: "ابتداءً من", buyNow: "اشترِ الآن", chooseDenom: "اختر القيمة", outOfStock: "غير متوفر",
    sort: "ترتيب", popular: "الأكثر شعبية", priceAsc: "السعر تصاعدياً", priceDesc: "السعر تنازلياً", brand: "العلامة", maxPrice: "أقصى سعر",
    checkout: "الدفع", fullName: "الاسم الكامل", email: "البريد الإلكتروني", phone: "رقم الهاتف", payMethod: "طريقة الدفع", summary: "ملخص الطلب", total: "المجموع", payNow: "ادفع الآن",
    orderNo: "رقم الطلب", status: "الحالة", yourCode: "الكود الخاص بك", copy: "نسخ", copied: "تم النسخ!",
    paid: "مدفوع", pending: "قيد الانتظار", fulfilled: "تم التسليم", failed: "فشل",
    orderThanks: "شكراً لطلبك!", waitingPay: "في انتظار تأكيد الدفع…", waitingCode: "تم تأكيد الدفع. جارٍ تجهيز الكود…",
    trackSub: "أدخل رقم الطلب وبريدك الإلكتروني.", find: "بحث", notFound: "الطلب غير موجود.",
    codeEmailed: "تم إرسال الكود أيضاً إلى بريدك.", simulate: "محاكاة الدفع (وضع الاختبار)",
  },
} as const;

export type TKey = keyof (typeof dict)["fr"];

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string }>({
  lang: "fr", setLang: () => {}, t: (k) => dict.fr[k],
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");
  useEffect(() => {
    const s = localStorage.getItem("lang");
    if (s === "ar" || s === "fr") setLangState(s);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  const setLang = (l: Lang) => { localStorage.setItem("lang", l); setLangState(l); };
  return <Ctx.Provider value={{ lang, setLang, t: (k) => dict[lang][k] }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);

export const formatDZD = (n: number) => `${new Intl.NumberFormat("fr-DZ").format(n)} DA`;
