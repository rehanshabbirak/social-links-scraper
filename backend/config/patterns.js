// Regex patterns for email and social media extraction
module.exports = {
  // Enhanced email regex patterns
  emailPatterns: [
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // Standard email
    /[a-zA-Z0-9._%+-]+\s*\[at\]\s*[a-zA-Z0-9.-]+\s*\[dot\]\s*[a-zA-Z]{2,}/g, // test[at]domain[dot]com
    /[a-zA-Z0-9._%+-]+\s*\(at\)\s*[a-zA-Z0-9.-]+\s*\(dot\)\s*[a-zA-Z]{2,}/g, // test(at)domain(dot)com
    /[a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\s*\.\s*[a-zA-Z]{2,}/g, // test @ domain . com
    /[a-zA-Z0-9._%+-]+\s*\[@\]\s*[a-zA-Z0-9.-]+\s*\[\.\]\s*[a-zA-Z]{2,}/g, // test[@]domain[.]com
    /[a-zA-Z0-9._%+-]+\s*{at}\s*[a-zA-Z0-9.-]+\s*{dot}\s*[a-zA-Z]{2,}/g, // test{at}domain{dot}com
  ],

  // Enhanced social media patterns
  socialPatterns: {
    facebook: /(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.com)\/[a-zA-Z0-9._-]+/gi,
    twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9._-]+/gi,
    linkedin: /(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com)\/(?:company\/[a-zA-Z0-9._-]+|in\/[a-zA-Z0-9._-]+)/gi,
    instagram: /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com)\/[a-zA-Z0-9._-]+/gi,
    youtube: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:channel\/[a-zA-Z0-9._-]+|c\/[a-zA-Z0-9._-]+|user\/[a-zA-Z0-9._-]+|@[a-zA-Z0-9._-]+)/gi,
    tiktok: /(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com)\/@[a-zA-Z0-9._-]+/gi,
    pinterest: /(?:https?:\/\/)?(?:www\.)?(?:pinterest\.com)\/[a-zA-Z0-9._-]+/gi,
    snapchat: /(?:https?:\/\/)?(?:www\.)?(?:snapchat\.com)\/add\/[a-zA-Z0-9._-]+/gi,
    reddit: /(?:https?:\/\/)?(?:www\.)?(?:reddit\.com)\/r\/[a-zA-Z0-9._-]+/gi,
    telegram: /(?:https?:\/\/)?(?:t\.me)\/[a-zA-Z0-9._-]+/gi,
    whatsapp: /(?:https?:\/\/)?(?:wa\.me)\/[0-9]+/gi,
    discord: /(?:https?:\/\/)?(?:discord\.gg|discord\.com)\/[a-zA-Z0-9._-]+/gi,
  },

  // Phone number pattern
  phonePattern: /(\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})/g,

  // Address pattern
  addressPattern: /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Way|Terrace|Ter|Circle|Cir|Square|Sq)/gi,

  // Contact link hints
  contactHints: /(contact|about|support|help|customer|reach|get\s*in\s*touch|kontakt)/i,

  // Cloudflare block indicators
  cloudflareBlockIndicators: [
    'sorry, you have been blocked',
    'you are unable to access',
    'attention required! | cloudflare',
    'checking your browser before accessing',
    'please wait while we check your browser',
    'cloudflare ray id',
    'cf-ray',
    'var cf_chl_opt',
    'cloudflare security check',
    'access denied',
    'blocked by cloudflare',
    'cloudflare protection',
    'security check failed',
    'cf-error-details',
    'cf-wrapper cf-header cf-error-overview',
    'blocked_why_headline',
    'blocked_resolve_headline',
    'this website is using a security service',
    'the action you just performed triggered',
    'performance & security by cloudflare',
    'cloudflare ray id:',
    'cf-footer-item',
    'cf-error-footer'
  ]
};
