
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

function cleanAscii(str) {
    return str
        .replace(/₹/g, 'INR ')
        .replace(/—/g, ' - ')
        .replace(/–/g, '-')
        .replace(/“/g, '"')
        .replace(/”/g, '"')
        .replace(/’/g, "'")
        .replace(/‘/g, "'");
}

function wrapText(rawText, font, size, maxWidth) {
    const text = cleanAscii(rawText);
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, size);
        if (testWidth <= maxWidth) {
            currentLine = testLine;
        } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
}

async function buildDeck() {
    const inputPath = 'x:\\\\all_Folder\\\\broswer_Downloads\\\\Startup Buildathon _ Idea Submission Deck.pdf';
    const outputPath = 'x:\\\\all_Folder\\\\broswer_Downloads\\\\Startup Buildathon _ Idea Submission Deck - SmartPrint.pdf';

    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const pages = pdfDoc.getPages();

    // Executive Google-Brand Color Palette
    const cGoogleBlue = rgb(0.102, 0.451, 0.91);   // #1a73e8
    const cGoogleRed = rgb(0.918, 0.263, 0.208);    // #ea4335
    const cGoogleGreen = rgb(0.204, 0.659, 0.325);  // #34a853
    const cGoogleYellow = rgb(0.984, 0.737, 0.016); // #fbbc04
    const cDark = rgb(0.06, 0.09, 0.16);           // #0f172a (Deep Slate)
    const cSubtext = rgb(0.32, 0.38, 0.47);        // #526077
    const cCardBg = rgb(0.975, 0.982, 0.992);      // #f8fafc (Clean off-white)
    const cCardBorder = rgb(0.85, 0.88, 0.92);     // #d9e0ea (Refined border)
    const cWhite = rgb(1, 1, 1);
    
    // Badge Backgrounds
    const cBlueBg = rgb(0.92, 0.95, 1.0);          // #ebf3ff
    const cGreenBg = rgb(0.91, 0.98, 0.93);        // #e8f9ed
    const cRedBg = rgb(1.0, 0.93, 0.93);           // #ffecec
    const cPurpleBg = rgb(0.95, 0.92, 1.0);        // #f3ebff
    const cPurple = rgb(0.49, 0.18, 0.86);         // #7c3aed

    function coverPlaceholder(page) {
        page.drawRectangle({
            x: 35,
            y: 235,
            width: 300,
            height: 45,
            color: cWhite,
        });
    }

    function drawCard(page, { x, y, width, height, bg = cCardBg, border = cCardBorder }) {
        page.drawRectangle({
            x,
            y,
            width,
            height,
            color: bg,
            borderColor: border,
            borderWidth: 0.85,
        });
    }

    function drawBadge(page, { x, y, text, bg = cBlueBg, textColor = cGoogleBlue, font = fontBold, size = 7.2 }) {
        const cleanT = cleanAscii(text);
        const textWidth = font.widthOfTextAtSize(cleanT, size);
        const paddingX = 6.5;
        const badgeW = textWidth + paddingX * 2;
        const badgeH = 13.5;
        page.drawRectangle({
            x,
            y: y - 2,
            width: badgeW,
            height: badgeH,
            color: bg,
        });
        page.drawText(cleanT, {
            x: x + paddingX,
            y: y + 2,
            size,
            font,
            color: textColor,
        });
        return badgeW;
    }

    function safeDrawText(page, rawText, options) {
        const text = cleanAscii(rawText);
        page.drawText(text, options);
    }

    // ─────────────────────────────────────────────────────────────
    // PAGE 2: Overview / Title Slide
    // ─────────────────────────────────────────────────────────────
    const p2 = pages[1];
    
    // Team Name: Alienxcode
    safeDrawText(p2, 'Alienxcode', {
        x: 165,
        y: 138,
        size: 14,
        font: fontBold,
        color: cGoogleBlue,
    });
    safeDrawText(p2, '  |  Project: SmartPrint (Zero-Retention Protocol)', {
        x: 250,
        y: 138,
        size: 9.5,
        font: fontRegular,
        color: cSubtext,
    });

    // Team Size: 5 Members
    safeDrawText(p2, '5 Members', {
        x: 155,
        y: 102,
        size: 12.5,
        font: fontBold,
        color: cDark,
    });

    // Executive Problem Statement Box on slide 2
    drawCard(p2, {
        x: 50,
        y: 8,
        width: 620,
        height: 52,
        bg: cCardBg,
        border: cCardBorder
    });
    
    const p2ProbLines = [
        '500M+ printouts daily in Indian stationery shops & cyber cafes force citizens to share sensitive personal documents',
        '(Aadhaar, PAN, financial statements, legal contracts) over WhatsApp & email, leaving unencrypted files on stranger PCs forever.',
        'SmartPrint provides an end-to-end encrypted zero-retention protocol with 100-second automated hardware self-destruction.'
    ];
    p2ProbLines.forEach((ln, idx) => {
        safeDrawText(p2, ln, {
            x: 62,
            y: 44 - idx * 14,
            size: 8.2,
            font: idx === 2 ? fontBold : fontRegular,
            color: idx === 2 ? cGoogleBlue : cDark,
        });
    });

    // ─────────────────────────────────────────────────────────────
    // PAGE 3: Problem Statement
    // ─────────────────────────────────────────────────────────────
    const p3 = pages[2];
    coverPlaceholder(p3);

    const p3CardW = 200;
    const p3CardH = 215;
    const p3Y = 32;
    const p3Data = [
        {
            x: 45,
            badge: 'THREAT 01 | TRANSMISSION RISK',
            badgeBg: cRedBg,
            badgeColor: cGoogleRed,
            title: 'The WhatsApp / Email Trap',
            points: [
                '500M+ Daily Printouts: Citizens across India visit photocopy stalls, cyber cafes, and campus reprography kiosks daily.',
                'Unencrypted PII Exposure: Aadhaar cards, PAN cards, income tax returns, medical files & bank statements sent to strangers.',
                'Zero Transmission Auditing: No cryptographic verification, consent tracking, or secure channel for mobile-to-shop transfer.'
            ]
        },
        {
            x: 260,
            badge: 'THREAT 02 | PERSISTENT RETENTION',
            badgeBg: cRedBg,
            badgeColor: cGoogleRed,
            title: 'Permanent Local Storage',
            points: [
                'Uncontrolled File Retention: Customer PDFs sit indefinitely inside shop PC "Downloads" and WhatsApp media directories.',
                'Severe Identity Theft Risk: Unrestricted local access leaves files vulnerable to rogue staff, malware, and subsequent users.',
                'DPDP Act 2023 Non-Compliance: Clear violation of India digital privacy regulations, carrying catastrophic statutory liabilities.'
            ]
        },
        {
            x: 475,
            badge: 'BOTTLENECK 03 | QUEUE FRICTION',
            badgeBg: cBlueBg,
            badgeColor: cGoogleBlue,
            title: 'Counter Queue Inefficiency',
            points: [
                'Chaotic Chat Browsing: Operators waste critical minutes searching through dozens of active chats to locate incoming PDFs.',
                'High Wait-Time Latency: 5 to 8 minutes wasted per customer just receiving, sorting, and previewing submitted documents.',
                'Formatting & Paper Waste: Misaligned margins and accidental color print errors result in discarded paper and lost revenue.'
            ]
        }
    ];

    p3Data.forEach(card => {
        drawCard(p3, { x: card.x, y: p3Y, width: p3CardW, height: p3CardH });
        drawBadge(p3, { x: card.x + 12, y: p3Y + p3CardH - 24, text: card.badge, bg: card.badgeBg, textColor: card.badgeColor });
        safeDrawText(p3, card.title, {
            x: card.x + 12,
            y: p3Y + p3CardH - 44,
            size: 11,
            font: fontBold,
            color: cDark,
        });

        let currentY = p3Y + p3CardH - 62;
        card.points.forEach(pt => {
            const lines = wrapText(pt, fontRegular, 8.2, p3CardW - 24);
            p3.drawCircle({
                x: card.x + 16,
                y: currentY - 3,
                size: 2,
                color: cGoogleBlue,
            });
            lines.forEach((l, lIdx) => {
                safeDrawText(p3, l, {
                    x: card.x + 24,
                    y: currentY - lIdx * 11,
                    size: 8.2,
                    font: lIdx === 0 && l.includes(':') ? fontBold : fontRegular,
                    color: cDark,
                });
            });
            currentY -= (lines.length * 11 + 7);
        });
    });

    // ─────────────────────────────────────────────────────────────
    // PAGE 4: Proposed Solution
    // ─────────────────────────────────────────────────────────────
    const p4 = pages[3];
    coverPlaceholder(p4);

    const p4W = 305;
    const p4H = 104;
    const p4Data = [
        {
            x: 45,
            y: 144,
            badge: 'CRYPTOGRAPHIC CORE',
            badgeBg: cBlueBg,
            badgeColor: cGoogleBlue,
            title: 'Client-Side AES-256-GCM Encryption',
            desc: 'Documents are encrypted directly inside the user browser using native Web Crypto API prior to dispatch. Decryption keys are NEVER written to disk or cloud databases - only handed off in volatile memory during counter session pairing.'
        },
        {
            x: 370,
            y: 144,
            badge: 'FRICTIONLESS ONBOARDING',
            badgeBg: cGreenBg,
            badgeColor: cGoogleGreen,
            title: 'Zero-App QR & 6-Digit PIN Pairing',
            desc: 'Users scan a counter QR code or enter a 6-digit terminal PIN on mobile web. Requires zero native app installations, zero user account creation, and zero phone number sharing, ensuring seamless anonymity.'
        },
        {
            x: 45,
            y: 32,
            badge: 'AUTOMATED PURGE',
            badgeBg: cPurpleBg,
            badgeColor: cPurple,
            title: '100-Second Self-Destruction Protocol',
            desc: 'Strict ephemeral lifecycle: decrypted document buffers exist solely in volatile RAM during active print spooling. After printing or upon 100-second TTL expiry, documents, memory chunks, and records are wiped permanently.'
        },
        {
            x: 370,
            y: 32,
            badge: 'HARDWARE INTEGRATION',
            badgeBg: cBlueBg,
            badgeColor: cGoogleBlue,
            title: 'Zero-Disk Shop Terminal (Electron Agent)',
            desc: 'Lightweight desktop app connects directly to physical laser/inkjet printers. Includes an active anti-shoulder-surfing screen-blur privacy shield, automated duplex/color configuration, and instant queue processing.'
        }
    ];

    p4Data.forEach(card => {
        drawCard(p4, { x: card.x, y: card.y, width: p4W, height: p4H });
        drawBadge(p4, { x: card.x + 12, y: card.y + p4H - 20, text: card.badge, bg: card.badgeBg, textColor: card.badgeColor });
        safeDrawText(p4, card.title, {
            x: card.x + 12,
            y: card.y + p4H - 38,
            size: 10.5,
            font: fontBold,
            color: cDark,
        });
        const descLines = wrapText(card.desc, fontRegular, 8.2, p4W - 24);
        descLines.forEach((l, lIdx) => {
            safeDrawText(p4, l, {
                x: card.x + 12,
                y: card.y + p4H - 52 - lIdx * 11,
                size: 8.2,
                font: fontRegular,
                color: cSubtext,
            });
        });
    });

    // ─────────────────────────────────────────────────────────────
    // PAGE 5: Solution Architecture
    // ─────────────────────────────────────────────────────────────
    const p5 = pages[4];
    coverPlaceholder(p5);

    const p5BlockW = 145;
    const p5BlockH = 215;
    const p5Y = 32;
    const p5Blocks = [
        {
            x: 45,
            step: 'TIER 1: USER CLIENT',
            title: 'Next.js 14 Mobile PWA',
            color: cGoogleBlue,
            points: [
                'Web Crypto AES-256 GCM client encryption.',
                'Zero-install browser experience on any smartphone.',
                'Selects B&W/Color, pages, duplex & copies.',
                'Generates ephemeral session pairing token.'
            ]
        },
        {
            x: 205,
            step: 'TIER 2: CLOUD RELAY',
            title: 'Next.js API + Neon DB',
            color: cGoogleYellow,
            points: [
                'Zero-Knowledge broker: never reads plaintext.',
                'Session handshake & pairing authentication.',
                'Encrypted payload buffering with signed TTL.',
                'Cascade cleanup worker upon session expiration.'
            ]
        },
        {
            x: 365,
            step: 'TIER 3: COUNTER AGENT',
            title: 'Electron Desktop Terminal',
            color: cGoogleGreen,
            points: [
                'Secure WebSocket connection to cloud relay.',
                'In-memory AES decryption buffer (zero disk I/O).',
                'Direct native spooling to local printers.',
                'Hardware print driver bridge & queue manager.'
            ]
        },
        {
            x: 525,
            step: 'TIER 4: SHIELD LAYER',
            title: 'Zero-Retention Engine',
            color: cGoogleRed,
            points: [
                '100s automatic countdown timer self-purge.',
                'Screen-blur overlay prevents shoulder-surfing.',
                'Anti-replay nonce & strict IDOR protection.',
                '100% DPDP Act 2023 compliant data posture.'
            ]
        }
    ];

    p5Blocks.forEach((b, idx) => {
        drawCard(p5, { x: b.x, y: p5Y, width: p5BlockW, height: p5BlockH });
        drawBadge(p5, { x: b.x + 8, y: p5Y + p5BlockH - 22, text: b.step, bg: cBlueBg, textColor: cGoogleBlue, size: 7 });
        safeDrawText(p5, b.title, {
            x: b.x + 8,
            y: p5Y + p5BlockH - 42,
            size: 9.5,
            font: fontBold,
            color: cDark,
        });

        let currentY = p5Y + p5BlockH - 58;
        b.points.forEach(pt => {
            const lines = wrapText(pt, fontRegular, 8, p5BlockW - 18);
            p5.drawCircle({
                x: b.x + 12,
                y: currentY - 3,
                size: 2,
                color: b.color,
            });
            lines.forEach((l, lIdx) => {
                safeDrawText(p5, l, {
                    x: b.x + 18,
                    y: currentY - lIdx * 11,
                    size: 8,
                    font: fontRegular,
                    color: cDark,
                });
            });
            currentY -= (lines.length * 11 + 6);
        });

        if (idx < 3) {
            safeDrawText(p5, '>>', {
                x: b.x + p5BlockW + 2,
                y: p5Y + p5BlockH / 2,
                size: 10,
                font: fontBold,
                color: cGoogleBlue,
            });
        }
    });

    // ─────────────────────────────────────────────────────────────
    // PAGE 6: Google AI Tools
    // ─────────────────────────────────────────────────────────────
    const p6 = pages[5];
    coverPlaceholder(p6);

    const p6Data = [
        {
            x: 45,
            badge: 'AUTONOMOUS ENGINEERING',
            badgeBg: cBlueBg,
            badgeColor: cGoogleBlue,
            tool: 'Google Antigravity',
            role: 'Primary Architecture & Development Engine',
            points: [
                'Autonomous Full-Stack Engineering: Architected, scaffolded, and integrated the complete multi-tier codebase (Next.js web + Electron desktop + APIs).',
                'Continuous Security Hardening: Validated API attack surfaces, eliminated token leaks, and enforced cryptographic nonces across endpoints.',
                'Rapid Multi-Platform Build: Unified development of Electron kiosk app and responsive mobile PWA in a single automated workflow.'
            ]
        },
        {
            x: 260,
            badge: 'SPECIALIZED AGENTS',
            badgeBg: cRedBg,
            badgeColor: cGoogleRed,
            tool: 'Google Agent Skills',
            role: 'Quality, Security & Craft Infrastructure',
            points: [
                'security-audit: Performed deep static and dynamic vulnerability review, preventing IDOR, path traversal, and unauthenticated document access.',
                'ponytail & ponytail-audit: Enforced extreme code minimalism; eliminated unnecessary dependencies for 40% faster boot on low-end shopkeeper PCs.',
                'design-skills: Crafted high-contrast, accessible UI system optimized for quick readability on crowded, sunlit retail shop counters.'
            ]
        },
        {
            x: 475,
            badge: 'AI PROTOTYPING',
            badgeBg: cGreenBg,
            badgeColor: cGoogleGreen,
            tool: 'Google AI Studio',
            role: 'Model Fine-Tuning & Pipeline Validation',
            points: [
                'Multimodal Prompt Engineering: Benchmarked and optimized structured extraction prompts for Indian ID cards (Aadhaar, PAN, Driving Licenses).',
                'PII Detection Latency Tuning: Validated sub-second response times for edge document verification without throttling user upload flows.',
                'System Prompt Alignment: Structured zero-retention guardrails ensuring Gemini processes document tokens entirely ephemerally.'
            ]
        }
    ];

    p6Data.forEach(card => {
        drawCard(p6, { x: card.x, y: 32, width: 200, height: 215 });
        drawBadge(p6, { x: card.x + 12, y: 32 + 215 - 22, text: card.badge, bg: card.badgeBg, textColor: card.badgeColor });
        safeDrawText(p6, card.tool, {
            x: card.x + 12,
            y: 32 + 215 - 40,
            size: 11.5,
            font: fontBold,
            color: cDark,
        });
        safeDrawText(p6, card.role, {
            x: card.x + 12,
            y: 32 + 215 - 52,
            size: 7.5,
            font: fontBold,
            color: cSubtext,
        });

        let currentY = 32 + 215 - 68;
        card.points.forEach(pt => {
            const lines = wrapText(pt, fontRegular, 8.2, 200 - 24);
            p6.drawCircle({
                x: card.x + 16,
                y: currentY - 3,
                size: 2,
                color: cGoogleBlue,
            });
            lines.forEach((l, lIdx) => {
                safeDrawText(p6, l, {
                    x: card.x + 24,
                    y: currentY - lIdx * 11,
                    size: 8.2,
                    font: lIdx === 0 && l.includes(':') ? fontBold : fontRegular,
                    color: cDark,
                });
            });
            currentY -= (lines.length * 11 + 6);
        });
    });

    // ─────────────────────────────────────────────────────────────
    // PAGE 7: Google AI Models
    // ─────────────────────────────────────────────────────────────
    const p7 = pages[6];
    coverPlaceholder(p7);

    const p7Cards = [
        {
            x: 45,
            width: 305,
            height: 215,
            badge: 'ACTIVE PRODUCTION INTEGRATION',
            badgeBg: cBlueBg,
            badgeColor: cGoogleBlue,
            model: 'Gemini 2.5 Flash / Gemini 2.0 Flash',
            sub: 'On-Device Privacy Guardian & Print Optimizer',
            points: [
                'On-The-Fly PII Redaction: Sub-second multimodal scan of document pages before upload. Detects and prompts user to automatically mask sensitive fields (Aadhaar numbers, PAN, signatures, CVVs).',
                'Smart Print Cost & Layout Optimizer: Evaluates document dimensions, margin whitespace, and color ratio. Automatically recommends ink-saving grayscale conversion, duplex printing, and N-up layouts.',
                'Extreme Velocity & Low Overhead: Leverages Flash model token velocity to deliver real-time recommendations with zero lag at the counter.'
            ]
        },
        {
            x: 370,
            width: 305,
            height: 215,
            badge: 'ROADMAP / NEXT PHASE',
            badgeBg: cPurpleBg,
            badgeColor: cPurple,
            model: 'Gemini Live Multimodal Voice Agent',
            sub: 'Hands-Free Regional Voice Counter Assistant',
            points: [
                'Voice-Driven Print Dispatch: Multilingual conversational terminal (Hindi, English, regional Indian languages) for busy stationery shopkeepers.',
                'Hands-Free Command Execution: Shopkeeper can simply speak: "Print 3 copies double-sided on A4, color mode black-and-white" while handling physical paper or billing.',
                'Automated Queue Intelligence: Real-time voice alerts when confidential high-priority jobs arrive or when paper replenishment is needed.'
            ]
        }
    ];

    p7Cards.forEach(card => {
        drawCard(p7, { x: card.x, y: 32, width: card.width, height: card.height });
        drawBadge(p7, { x: card.x + 12, y: 32 + card.height - 22, text: card.badge, bg: card.badgeBg, textColor: card.badgeColor });
        safeDrawText(p7, card.model, {
            x: card.x + 12,
            y: 32 + card.height - 40,
            size: 11,
            font: fontBold,
            color: cDark,
        });
        safeDrawText(p7, card.sub, {
            x: card.x + 12,
            y: 32 + card.height - 52,
            size: 8,
            font: fontBold,
            color: cSubtext,
        });

        let currentY = 32 + card.height - 68;
        card.points.forEach(pt => {
            const lines = wrapText(pt, fontRegular, 8.2, card.width - 24);
            p7.drawCircle({
                x: card.x + 16,
                y: currentY - 3,
                size: 2,
                color: cGoogleBlue,
            });
            lines.forEach((l, lIdx) => {
                safeDrawText(p7, l, {
                    x: card.x + 24,
                    y: currentY - lIdx * 11,
                    size: 8.2,
                    font: lIdx === 0 && l.includes(':') ? fontBold : fontRegular,
                    color: cDark,
                });
            });
            currentY -= (lines.length * 11 + 6);
        });
    });

    // ─────────────────────────────────────────────────────────────
    // PAGE 8: Market Impact, Business Viability & Live Traction
    // ─────────────────────────────────────────────────────────────
    const p8 = pages[7];

    safeDrawText(p8, 'Market Impact & Business Viability', {
        x: 45,
        y: 320,
        size: 20,
        font: fontBold,
        color: cDark,
    });
    safeDrawText(p8, 'Commercial potential, DPDP Act compliance, and working prototype status.', {
        x: 45,
        y: 302,
        size: 9.5,
        font: fontRegular,
        color: cSubtext,
    });

    const p8Data = [
        {
            x: 45,
            badge: 'MASSIVE MARKET (TAM)',
            badgeBg: cBlueBg,
            badgeColor: cGoogleBlue,
            title: '1.5M+ Shops in India',
            points: [
                'Massive Footprint: Stationery shops, cyber cafes, court xerox stalls & college reprography centers.',
                '100M+ Pages Daily: High-frequency daily utility in every university, hospital, and commercial hub.',
                'First-Mover Advantage: First dedicated zero-retention physical printing protocol in emerging markets.'
            ]
        },
        {
            x: 260,
            badge: 'B2B BUSINESS MODEL',
            badgeBg: cGreenBg,
            badgeColor: cGoogleGreen,
            title: 'Freemium Micro-SaaS',
            points: [
                '100% Free for Consumers: Zero friction, no account barrier drives rapid viral consumer adoption.',
                'Shopkeeper SaaS (INR 199/mo): "SmartPrint Certified Privacy Kiosk" badge, priority queueing, analytics.',
                'B2B Enterprise Licensing: Tailored deployments for university campuses, law firms & co-working chains.'
            ]
        },
        {
            x: 475,
            badge: 'COMPLIANCE & TRACTION',
            badgeBg: cPurpleBg,
            badgeColor: cPurple,
            title: 'DPDP Act & Live Prototype',
            points: [
                'DPDP Act 2023 Shield: Protects shopkeepers against crippling fines (up to INR 250 Cr) for unlawful data storage.',
                'Working Live Product: Production Next.js PWA live at smartprint-tau.vercel.app with Neon PostgreSQL.',
                'Ready-to-Deploy Kiosk: Electron desktop agent connects directly to thermal/laser printers in seconds.'
            ]
        }
    ];

    p8Data.forEach(card => {
        drawCard(p8, { x: card.x, y: 32, width: 200, height: 245 });
        drawBadge(p8, { x: card.x + 12, y: 32 + 245 - 24, text: card.badge, bg: card.badgeBg, textColor: card.badgeColor });
        safeDrawText(p8, card.title, {
            x: card.x + 12,
            y: 32 + 245 - 44,
            size: 11.5,
            font: fontBold,
            color: cDark,
        });

        let currentY = 32 + 245 - 62;
        card.points.forEach(pt => {
            const lines = wrapText(pt, fontRegular, 8.2, 200 - 24);
            p8.drawCircle({
                x: card.x + 16,
                y: currentY - 3,
                size: 2,
                color: cGoogleBlue,
            });
            lines.forEach((l, lIdx) => {
                safeDrawText(p8, l, {
                    x: card.x + 24,
                    y: currentY - lIdx * 11,
                    size: 8.2,
                    font: lIdx === 0 && l.includes(':') ? fontBold : fontRegular,
                    color: cDark,
                });
            });
            currentY -= (lines.length * 11 + 7);
        });
    });

    const finalBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, finalBytes);
    
    // Also copy to project directories
    fs.writeFileSync('X:\\\\all_Folder\\\\HACKATHON\\\\AMITY HACKATHON\\\\Startup Buildathon _ Idea Submission Deck - SmartPrint.pdf', finalBytes);
    fs.writeFileSync('X:\\\\all_Folder\\\\HACKATHON\\\\AMITY HACKATHON\\\\smartprint\\\\Startup Buildathon _ Idea Submission Deck - SmartPrint.pdf', finalBytes);
    
    console.log('SUCCESS! Filled PDF written to all 3 paths!');
    console.log('Final PDF Size:', finalBytes.length, 'bytes');
}

buildDeck().catch(console.error);
