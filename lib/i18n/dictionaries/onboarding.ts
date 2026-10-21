import type { Lang } from '../language-context';
import type { Dict } from '../language-context';

/** Client onboarding + completion. Keys `onboarding.*`. */
export const onboarding: Record<Lang, Dict> = {
  fr: {
    'onboarding.clientTitle': 'Complétez votre profil',
    'onboarding.clientSub': 'Quelques informations pour finaliser votre inscription.',
    'onboarding.fillAll': 'Veuillez remplir tous les champs obligatoires.',
    'onboarding.finish': 'Terminer',
    'onboarding.doneClaim': 'Demande de revendication envoyée !',
    'onboarding.doneAdd': 'Compte créé !',
    'onboarding.doneClient': 'Bienvenue sur AB Santé !',
    'onboarding.doneClaimBody': 'Votre demande pour le profil Dr {name} est en cours de vérification. Nous vous contacterons si besoin avant de vous lier le profil.',
    'onboarding.doneAddBody': "Votre profil est actif et visible dans la recherche patients. Notre équipe vous attribuera le badge « Vérifié » après contrôle des documents.",
    'onboarding.doneClientBody': 'Vos informations sont enregistrées. Vous pouvez réserver votre premier rendez-vous dès maintenant.',
    'onboarding.enter': "Accéder à l'application",
    'onboarding.error': 'Erreur',
  },
  en: {
    'onboarding.clientTitle': 'Complete your profile',
    'onboarding.clientSub': 'A few details to finalize your registration.',
    'onboarding.fillAll': 'Please fill in all required fields.',
    'onboarding.finish': 'Finish',
    'onboarding.doneClaim': 'Claim request sent!',
    'onboarding.doneAdd': 'Account created!',
    'onboarding.doneClient': 'Welcome to AB Santé!',
    'onboarding.doneClaimBody': 'Your request for the Dr {name} profile is under review. We will contact you if needed before linking the profile.',
    'onboarding.doneAddBody': 'Your profile is active and visible in patient search. Our team will add the "Verified" badge after reviewing your documents.',
    'onboarding.doneClientBody': 'Your details are saved. You can book your first appointment right away.',
    'onboarding.enter': 'Open the app',
    'onboarding.error': 'Error',
  },
  ar: {
    'onboarding.clientTitle': 'أكمل ملفك',
    'onboarding.clientSub': 'بعض المعلومات لإتمام تسجيلك.',
    'onboarding.fillAll': 'يرجى ملء جميع الحقول المطلوبة.',
    'onboarding.finish': 'إنهاء',
    'onboarding.doneClaim': 'تم إرسال طلب المطالبة!',
    'onboarding.doneAdd': 'تم إنشاء الحساب!',
    'onboarding.doneClient': 'مرحباً بك في AB Santé!',
    'onboarding.doneClaimBody': 'طلبك لملف الدكتور {name} قيد التحقق. سنتصل بك عند الحاجة قبل ربط الملف.',
    'onboarding.doneAddBody': 'ملفك مفعّل ويظهر في بحث المرضى. سيضيف فريقنا شارة "موثّق" بعد مراجعة الوثائق.',
    'onboarding.doneClientBody': 'تم حفظ معلوماتك. يمكنك حجز موعدك الأول الآن.',
    'onboarding.enter': 'الدخول إلى التطبيق',
    'onboarding.error': 'خطأ',
  },
};
