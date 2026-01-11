import { PriceData, RiskLevel, UrgencyLevel, AppSettings, MarketRatesData } from './types';

export const AI_BUFFER_MULTIPLIER = 1.3; // 30% buffer for failed generations/iterations

// Manual Data from User JSON
export const FALLBACK_DATA: PriceData = {
  meta: {
    last_updated: "2026-01-08"
  },
  tools: [
    // --- VIDEO ---
    { id: "video_sora_2_pro", name: "SORA 2 Pro", lightning_price: 50.0, unit: "generation", category: "video" },
    { id: "video_sora_2", name: "SORA 2", lightning_price: 18.0, unit: "generation", category: "video" },
    { id: "video_veo_3_1", name: "VEO 3.1", lightning_price: 119.0, unit: "generation", category: "video" },
    { id: "video_veo_3_1_fast", name: "VEO 3.1 Fast", lightning_price: 19.0, unit: "generation", category: "video" },
    { id: "video_veo_3_1_fast_relax", name: "VEO 3.1 Fast Relax", lightning_price: 13.0, unit: "generation", category: "video" },
    { id: "video_runway_gen4", name: "Runway Gen-4", lightning_price: 14.0, unit: "generation", category: "video" },
    { id: "video_runway_gen3", name: "Runway Gen-3", lightning_price: 14.0, unit: "generation", category: "video" },
    { id: "video_runway_style", name: "RW: Video Stylizer", lightning_price: 14.0, unit: "generation", category: "video" },
    { id: "video_luma", name: "Luma Dream Machine", lightning_price: 14.0, unit: "generation", category: "video" },
    { id: "video_kling", name: "Kling AI", lightning_price: 6.0, unit: "generation", category: "video" },
    { id: "video_pika", name: "Pika Full", lightning_price: 12.0, unit: "generation", category: "video" },
    { id: "video_hailuo_02", name: "Hailuo MiniMax 02", lightning_price: 14.0, unit: "generation", category: "video" },
    { id: "video_hailuo_01", name: "Hailuo MiniMax 01", lightning_price: 8.5, unit: "generation", category: "video" },
    { id: "video_mj", name: "MidJourney Video", lightning_price: 15.0, unit: "generation", category: "video" },
    { id: "video_seedance", name: "Seedance Lite/Pro", lightning_price: 6.0, unit: "generation", category: "video" },
    { id: "video_higgsfield", name: "Higgsfield", lightning_price: 12.0, unit: "generation", category: "video" },
    { id: "video_topaz", name: "Topaz AI", lightning_price: 1.0, unit: "second", category: "video" },
    { id: "video_upscale_runway", name: "RunWay Upscale x4", lightning_price: 5.0, unit: "generation", category: "video" },
    { id: "video_upscale_clarity", name: "Clarity Upscaler", lightning_price: 1.0, unit: "generation", category: "video" },

    // --- AVATAR & LIPSYNC ---
    { id: "avatar_heygen_4", name: "HeyGen Avatar 4", lightning_price: 1.2, unit: "second", category: "avatar" },
    { id: "avatar_runway_act_two", name: "RunWay Act-Two", lightning_price: 2.0, unit: "second", category: "avatar" },
    { id: "avatar_hedra", name: "Hedra", lightning_price: 2.7, unit: "second", category: "avatar" },
    { id: "avatar_sync_runway", name: "Lipsync (Runway)", lightning_price: 2.7, unit: "second", category: "avatar" },
    { id: "avatar_sync_kling", name: "Lipsync (Kling)", lightning_price: 1.2, unit: "second", category: "avatar" },
    { id: "avatar_creation", name: "Avatar Creation", lightning_price: 0.87, unit: "second", category: "avatar" }, // 13.00 / 15 sec

    // --- IMAGE ---
    { id: "img_flux_1_1_ultra", name: "Flux 1.1 Pro Ultra", lightning_price: 2.5, unit: "generation", category: "image" },
    { id: "img_flux_1_1_pro", name: "Flux 1.1 Pro", lightning_price: 1.5, unit: "generation", category: "image" },
    { id: "img_flux_1_pro", name: "Flux 1 Pro", lightning_price: 0.8, unit: "generation", category: "image" },
    { id: "img_flux_1", name: "Flux 1", lightning_price: 0.3, unit: "generation", category: "image" },
    { id: "img_flux_lora", name: "Flux LoRa Train", lightning_price: 0.18, unit: "generation", category: "image" },
    { id: "img_recraft_v3_vec", name: "Recraft v3 Vector", lightning_price: 4.0, unit: "generation", category: "image" },
    { id: "img_recraft_v3", name: "Recraft v3", lightning_price: 2.0, unit: "generation", category: "image" },
    { id: "img_dalle_3_turbo", name: "Dall-e 3 Turbo", lightning_price: 1.5, unit: "generation", category: "image" },
    { id: "img_imagen_4", name: "Google Imagen 4", lightning_price: 1.5, unit: "generation", category: "image" },
    { id: "img_mj_edit", name: "MidJourney Editor", lightning_price: 1.5, unit: "generation", category: "image" },
    { id: "img_mj", name: "MidJourney Full", lightning_price: 1.0, unit: "generation", category: "image" },
    { id: "img_ideogram", name: "Ideogram", lightning_price: 0.9, unit: "generation", category: "image" },
    { id: "img_sora", name: "SORA Images", lightning_price: 0.8, unit: "generation", category: "image" },
    { id: "img_seedream_45", name: "Seedream 4.5", lightning_price: 2.0, unit: "generation", category: "image" },
    { id: "img_seedream", name: "Seedream", lightning_price: 1.2, unit: "generation", category: "image" },
    { id: "img_kling_kolors", name: "Kling Kolors", lightning_price: 1.1, unit: "generation", category: "image" },
    { id: "img_faceswap", name: "Face Swap", lightning_price: 0.15, unit: "generation", category: "image" },
    { id: "img_upscale_syntx", name: "Syntx Enhancer x2", lightning_price: 0.4, unit: "generation", category: "image" },
    { id: "img_mix", name: "Image Mixing", lightning_price: 1.0, unit: "generation", category: "image" },
    { id: "img_describe", name: "Image Describe", lightning_price: 1.0, unit: "generation", category: "image" },

    // --- AUDIO ---
    { id: "audio_elevenlabs", name: "ElevenLabs Music", lightning_price: 16.0, unit: "generation", category: "audio" },
    { id: "audio_udio", name: "Udio AI", lightning_price: 10.0, unit: "generation", category: "audio" },
    { id: "audio_suno", name: "Suno AI", lightning_price: 8.0, unit: "generation", category: "audio" },
    { id: "audio_tts_eleven", name: "ElevenLabs TTS", lightning_price: 2.0, unit: "generation", category: "audio" },
    { id: "audio_tts_openai", name: "OpenAI TTS", lightning_price: 1.0, unit: "generation", category: "audio" },
    
    // --- TEXT/LLM ---
    { id: "text_gpt4o", name: "GPT-4o", lightning_price: 1.0, unit: "generation", category: "text" },
    { id: "text_claude_3_5_sonnet", name: "Claude 3.5 Sonnet", lightning_price: 1.5, unit: "generation", category: "text" },
    { id: "text_gemini_pro", name: "Gemini 1.5 Pro", lightning_price: 0.5, unit: "generation", category: "text" }
  ]
};

export const RISK_LABELS: Record<number, string> = {
  [RiskLevel.LOW]: '🟢 Четкое ТЗ (Low Risk)',
  [RiskLevel.MID]: '🟡 Есть вопросы (Mid Risk)',
  [RiskLevel.HIGH]: '🔴 Полный Хаос (High Risk)'
};

export const URGENCY_LABELS: Record<number, string> = {
  [UrgencyLevel.STANDARD]: 'Стандарт (7-14 дн)',
  [UrgencyLevel.ASAP]: '🔥 Срочно (3-5 дн)',
  [UrgencyLevel.YESTERDAY]: '☠️ Вчера (48ч)'
};

export const DEFAULT_SETTINGS: AppSettings = {
  hourlyRate: 500, // RUB - Default
  packagePriceUsd: 1690, // Syntx Rate (RUB)
  packageTokens: 680,  // Syntx Rate
  targetMonthlyIncome: 100000, // Default Target
  billableHoursPerMonth: 170, // Standard work month (approx 21 days * 8h)
  creatorName: "",
  creatorTelegram: "",
  creatorAvatarUrl: "",
  clientName: ""
};

export const CYBER_QUOTES = [
  "Вы платите не за кнопки, а за то, что я знаю, какие не нажимать.",
  "Нейросеть — это кисть. Я — художник, который знает, как ее держать.",
  "Дешево, быстро, качественно. Выберите два (или купите мой промпт).",
  "Скупой платит дважды: сначала школьнику, потом мне за переделку.",
  "Мой час стоит дорого, потому что я потратил 1000 часов, чтобы сделать это за 5 минут.",
  "AI не заменит вас. Вас заменит тот, кто умеет пользоваться AI лучше вас.",
  "В мире копипаста оригинал стоит миллионы.",
  "Генерация — это рулетка. Я продаю выигрышные номера.",
  "Клиент прав, пока не попросит сделать 'как в том вирусном ролике' за 500 рублей.",
  "Будущее уже здесь, просто оно неравномерно распределено (и стоит денег)."
];

export const MARKET_RATES: MarketRatesData = {
    meta: {
        currency: "RUB",
        last_updated: "2025-02-15",
        min_engagement_fee: 15000
    },
    services: [
        {
            id: "svc_video_promo",
            name: "AI Рекламный Ролик (30 сек)",
            category: "Video Gen",
            base_unit_amount: 30, // seconds
            unit_label: "сек",
            tiers: {
                tier_1: {
                    label: "Freelance / Dumping",
                    price_range: [5000, 15000],
                    sla_days: 7,
                    desc: "Новички, стоки, простые склейки. Минимум анимации, плавающий стиль. 50/50 результат."
                },
                tier_2: {
                    label: "Pro Studio Standard",
                    price_range: [45000, 80000],
                    sla_days: 5,
                    desc: "Опытный промптер. Единая стилистика (LoRA), липсинк, саунд-дизайн, пост-продакшн (After Effects)."
                },
                tier_3: {
                    label: "Creative Agency",
                    price_range: [150000, 400000],
                    sla_days: 14,
                    desc: "Креативный директор, сценарист, кастомный саунд, 3-5 итераций правок, права на использование."
                }
            }
        },
        {
            id: "svc_avatar_shorts",
            name: "Avatar Reels / Shorts (60 сек)",
            category: "Video Gen",
            base_unit_amount: 60, // seconds
            unit_label: "сек",
            tiers: {
                tier_1: {
                    label: "HeyGen Only",
                    price_range: [2000, 5000],
                    sla_days: 2,
                    desc: "Чистая генерация в HeyGen/Synthesia. Без монтажа, без динамики, 'говорящая голова'."
                },
                tier_2: {
                    label: "Pro Content",
                    price_range: [10000, 25000],
                    sla_days: 3,
                    desc: "Динамичный монтаж, субтитры, B-Roll вставки, зумы, удержание внимания. (Hedra/Runway Act-2)."
                },
                tier_3: {
                    label: "Top Production",
                    price_range: [50000, 100000],
                    sla_days: 7,
                    desc: "Кастомный аватар (Fine-tune), профессиональная озвучка, сценарная работа, пакет из 5-10 роликов."
                }
            }
        },
        {
            id: "svc_image_pack",
            name: "Пак Изображений (10 шт)",
            category: "Image Gen",
            base_unit_amount: 10,
            unit_label: "шт",
            tiers: {
                tier_1: {
                    label: "MidJourney Raw",
                    price_range: [1000, 3000],
                    sla_days: 1,
                    desc: "Сырые генерации без апскейла и ретуши. 'Как есть'."
                },
                tier_2: {
                    label: "Art Direction",
                    price_range: [10000, 25000],
                    sla_days: 3,
                    desc: "Единый стиль, контроль композиции (ControlNet), апскейл, ретушь артефактов (Photoshop/Inpaint)."
                },
                tier_3: {
                    label: "Commercial License",
                    price_range: [50000, 120000],
                    sla_days: 7,
                    desc: "Векторизация (если нужно), подготовка к печати, сложный коллажинг, передача полных прав."
                }
            }
        },
        {
           id: "svc_music_track",
           name: "AI Саундтрек (2 мин)",
           category: "Audio Gen",
           base_unit_amount: 1, // track
           unit_label: "трек",
           tiers: {
               tier_1: {
                   label: "Suno/Udio Raw",
                   price_range: [500, 1500],
                   sla_days: 1,
                   desc: "Сырая генерация, возможны артефакты. Без сведения."
               },
               tier_2: {
                   label: "Mixed & Mastered",
                   price_range: [5000, 15000],
                   sla_days: 3,
                   desc: "Склейка из лучших кусков, мастеринг, стемы (раздельные дорожки), чистка шумов."
               },
               tier_3: {
                   label: "Commercial Jingle",
                   price_range: [30000, 80000],
                   sla_days: 5,
                   desc: "Написание лирики под бренд, вокал (Voice Conversion), полная очистка прав."
               }
           }
       }
    ]
};