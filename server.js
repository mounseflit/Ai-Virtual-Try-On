/**
 * Magic Face Transform — Node.js
 * Works with Runware API (primary) and fal.ai FLUX.1 Kontext [pro] and google's Imagen.
*/

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Attempt to import nodemailer. If not installed, we will emulate success for email endpoint.
let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (_) { }

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

/*
 * ===== Environment & Provider Config =====
 * RUNWARE_API_KEY is required for image inference via runware:101@1.
 * FAL_API_KEY is required for fal.ai FLUX.1 Kontext [pro].
 * GEMINI_API_KEY is required for google's Imagen gemini-2.5-flash-image-preview.
 */


// for runware use :

const RUNWARE_API_KEY = process.env.RUNWARE_API_KEY;

const RUNWARE_API_URL = 'https://api.runware.ai/v1';

// for google imagen use :

const MODEL_ID = "gemini-2.5-flash-image-preview";

const GENERATE_CONTENT_API = "streamGenerateContent";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// for fal.ai use :

const FAL_API_KEY = process.env.FAL_API_KEY;

let fal = null;
if (FAL_API_KEY) {
  try {
    fal = require('@fal-ai/client').fal;
    fal.config({ credentials: FAL_API_KEY });
  } catch (e) {
    console.warn('⚠️  @fal-ai/client not installed. Run `npm i @fal-ai/client` to enable fallback.');
  }
}




// ===== Middleware =====
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(express.static('public'));




// ===== Helper functions =====
function isDataUrl(str) {
  return typeof str === 'string' && str.startsWith('data:image/');
}

async function uploadToImgBB(base64Image) {
  const apiKey = process.env.IMGBB_API_KEY;
  const form = new FormData();
  form.append("image", base64Image);

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: "POST",
      body: form
    });
    const result = await response.json();

    if (result.success) {
      console.log("Image link:", result.data.url);
      return result.data.url; // direct shareable link
    } else {
      console.error("ImgBB upload failed:", result);
      return null;
    }
  } catch (error) {
    console.error("Error uploading to ImgBB:", error);
    return null;
  }
}

function buildEnhancedPrompt(customizationText, extraNote = '') {
  const trimmed = (customizationText || '').trim();
  const customizationLine = trimmed
    ? `Apply these wardrobe and styling directions: ${trimmed}.`
    : 'Refresh the outfit to a contemporary, stylish look that suits the existing subject.';
  const extra = extraNote ? ` ${extraNote.trim()}` : '';
  return [
    '--keep-face -- Preserve the exact face, expression, body shape, hairstyle, skin tone, and pose of the person in the reference photo. Do not alter their identity.',
    customizationLine,
    'Ensure every garment fits naturally around the body with realistic fabric behavior, seams, and shadows. Integrate accessories so they follow perspective and anatomy.',
    `Render a photorealistic vertical full-body fashion portrait with cohesive lighting and a believable environment.${extra}`
  ].join(' ');
}

async function runwareUploadImage(dataUri) {
  const taskUUID = uuidv4();
  const payload = [
    {
      taskType: 'authentication',
      apiKey: RUNWARE_API_KEY,
    },
    {
      taskType: 'imageUpload',
      taskUUID,
      image: dataUri,
    },
  ];
  const { data } = await axios.post(RUNWARE_API_URL, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 60000,
  });
  const res = Array.isArray(data?.data)
    ? data.data.find(
      (d) => d.taskType === 'imageUpload' && d.taskUUID === taskUUID,
    )
    : data?.data?.[0];
  if (!res?.imageUUID) {
    throw new Error('Runware image upload failed (no imageUUID).');
  }
  return res.imageUUID;
}


// ****** AI Image Generation ******


async function runwareImageToImage({ seedImageUUID, positivePrompt, width = 1024, height = 1024 }) {
  const taskUUID = uuidv4();
  const payload = [
    {
      taskType: 'authentication',
      apiKey: RUNWARE_API_KEY,
    },
    {
      taskType: 'imageInference',
      taskUUID,
      outputType: 'URL',
      outputFormat: 'JPG',
      positivePrompt,
      seedImage: seedImageUUID,
      model: 'runware:97@1',
      height,
      width,
      steps: 28,
      CFGScale: 3.5,
      numberResults: 1,
      includeCost: false,
      checkNSFW: false,
      deliveryMethod: 'sync',
    },
  ];
  const { data } = await axios.post(RUNWARE_API_URL, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 120000,
  });
  const res = Array.isArray(data?.data)
    ? data.data.find(
      (d) => d.taskType === 'imageInference' && d.taskUUID === taskUUID,
    )
    : data?.data?.[0];
  const imageURL = res?.imageURL || res?.images?.[0]?.imageURL;
  if (!imageURL) {
    const raw = JSON.stringify(data);
    throw new Error('Runware imageInference missing imageURL. Raw: ' + raw.slice(0, 500));
  }
  return imageURL;
}


async function falKontextEdit({ dataUri, prompt }) {
  if (!fal) {
    throw new Error('fal.ai client unavailable.');
  }
  // Convert data URI to Buffer and create a stream-like object.
  const buffer = Buffer.from(dataUri.split(',')[1], 'base64');
  const { Readable } = require('stream');
  const file = new Readable();
  file._read = () => { };
  file.push(buffer);
  file.push(null);
  file.name = `input-${Date.now()}.png`;
  file.type = 'image/png';

  const imageUrl = await fal.storage.upload(file);
  const result = await fal.subscribe('fal-ai/flux-pro/kontext', {
    input: {
      prompt,
      image_url: imageUrl,
    },
    logs: false,
  });

  // create a url using imgbb
  const url = await uploadToImgBB(imagePart);

  // const url = result?.data?.images?.[0]?.url;

  if (!url) throw new Error('fal.ai result missing image url.');
  return url;
}


async function googleImagen({ dataUri, prompt }) {

  const base64Image = dataUri.includes(",") ? dataUri.split(",")[1] : dataUri;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            // REST uses snake_case
            inline_data: {
              mime_type: "image/jpeg",
              data: base64Image,
            },
          },
        ],
      },
    ],
    generationConfig: {
      // Ask for both text + image back (model may return text parts too)
      responseModalities: ["IMAGE"],
    },
  };

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:${GENERATE_CONTENT_API}?key=${GEMINI_API_KEY}`;

    const response = await axios.post(url, requestBody, {
      headers: { "Content-Type": "application/json" },
      timeout: 120_000,
    });

    if (response.status !== 200) {
      throw new Error(`Google Imagen API error: ${response.status} ${response.statusText}`);
    }

    const data = response.data;

    // Find the first inline image in returned parts
    let imageMime = "image/png"; // default fallback
    let textOutput = "";



    const imagePart = data[data.length - 1].candidates[0].content.parts[0].inlineData.data;


    if (!imagePart) {
      // Useful error with any text the model returned
      throw new Error(
        "Google Imagen response missing image part." +
        (textOutput ? ` Model said: ${textOutput.slice(0, 300)}…` : "")
      );
    }

    
    // const imageUrl = await uploadToImgBB(imagePart);

    // const imageUrl = `data:${imageMime};base64,${imagePart}`;
    
    const imageUrl = imagePart;

    return imageUrl;

  } catch (error) {
    const raw = JSON.stringify(error.response?.data || error.message || error);
    throw new Error("Google Imagen API error: " + raw.slice(0, 500));
  }
}




// ===== Routes =====


// Serve main page with static files
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    runwareConfigured: Boolean(RUNWARE_API_KEY),
    falConfigured: Boolean(FAL_API_KEY && fal),
    googleImagenConfigured: Boolean(process.env.GEMINI_API_KEY),
    emailConfigured: Boolean(nodemailer && process.env.SMTP_FROM && process.env.SMTP_USER && process.env.SMTP_PASS),
  });
});


app.post('/api/transform/runware', async (req, res) => {
  try {
    const { image, prompt } = req.body || {};
    if (!image || !isDataUrl(image)) {
      return res.status(400).json({ error: 'Invalid or missing image (must be data URL).' });
    }
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing prompt.' });
    }
    // 1. Upload image to Runware
    const seedImageUUID = await runwareUploadImage(image);
    // 2. Build enhanced prompt: subtle improvements for better quality
  const enhancedPrompt = buildEnhancedPrompt(prompt);
    // 3. Generating using Runware
    try {
      if (RUNWARE_API_KEY) {
        const imageURL = await runwareImageToImage({ seedImageUUID, positivePrompt: enhancedPrompt });
        return res.json({ success: true, image_url: imageURL, prompt_used: enhancedPrompt, provider: 'runware' });
      } else {
        console.warn('⚠️  Runware not configured, skipping to fal.ai fallback.');
        throw new Error('Runware not configured.');
      }
    } catch (rwErr) {
      console.warn('Runware generation failed', rwErr?.message || rwErr);
    }
    // Default case (should not reach here)

    return res.status(500).json({ error: 'failed.' });

  } catch (error) {
    console.error('Transform error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Server error' });
  }
});


app.post('/api/transform/fal', async (req, res) => {
  try {
    const { image, prompt } = req.body || {};
    if (!image || !isDataUrl(image)) {
      return res.status(400).json({ error: 'Invalid or missing image (must be data URL).' });
    }
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing prompt.' });
    }
    // 1. Build enhanced prompt: subtle improvements for better quality
  const enhancedPrompt = buildEnhancedPrompt(prompt);
    // 2. Generating using fal.ai
    try {

      if (FAL_API_KEY && fal) {
        try {
          const imageURL = await falKontextEdit({ dataUri: image, prompt: enhancedPrompt });
          return res.json({ success: true, image_url: imageURL, prompt_used: enhancedPrompt, provider: 'fal-ai/flux-pro/kontext' });
        } catch (falErr) {
          console.error('fal.ai generation failed:', falErr?.message || falErr);
          return res.status(502).json({ error: 'fal.ai generation failed.', details: falErr?.message || falErr });
        }
      } else {
        console.warn('⚠️  Fallback not configured, skipping fal.ai.');
        return res.status(500).json({ error: 'fal.ai not configured.' });
      }

    } catch (rwErr) {
      console.warn('fal generation failed', rwErr?.message || rwErr);

    }
    // Default case (should not reach here)

    return res.status(500).json({ error: 'failed.' });

  } catch (error) {
    console.error('Transform error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Server error' });
  }
});


app.post('/api/transform/google', async (req, res) => {
  try {
    const { image, prompt } = req.body || {};
    if (!image || !isDataUrl(image)) {
      return res.status(400).json({ error: 'Invalid or missing image (must be data URL).' });
    }
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing prompt.' });
    }
    // 1. Build enhanced prompt: subtle improvements for better quality
  const enhancedPrompt = buildEnhancedPrompt(prompt, 'If a background or location is requested, blend it naturally with the subject. Always keep the frame vertical full body.');
    // 2. Generating using googleImagen
    const imageUrl = await googleImagen({ dataUri: image, prompt: enhancedPrompt });
    if (!imageUrl) {
      return res.status(500).json({ error: 'Google Imagen API failed to generate image.' });
    }

    const realUrl = await uploadToImgBB(imageUrl);

    const dataUrl = `data:image/png;base64,${imageUrl}`;

    return res.json({ success: true, image_url: imageUrl, real_url: realUrl, data_url: dataUrl, prompt_used: enhancedPrompt, provider: 'google-imagen' });

  } catch (error) {
    console.error('Transform error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Server error' });
  }
});


app.post('/api/send-email', async (req, res) => {
  const { to, imageUrl } = req.body || {};
  if (!to) {
    return res.status(400).json({ error: "Missing 'to' address" });
  }




  try {

    // Send email 

    const base64 = imageUrl; // raw base64, no data:image/... prefix

    const pngBuffer = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), "base64");

    const transporter = nodemailer.createTransport({
      service: "gmail", 
      auth: {
        user: 'litnitimounsef@gmail.com',
        pass: 'slpnmsoifpcjttbg'
      }
    });

    await transporter.sendMail({
      to: to,
      subject: "Your Virtual Try-On is Ready! ✨",
      html: `<!DOCTYPE html>
  <html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Virtual Try-On</title>
    <!--[if mso]>
    <xml>
    <o:OfficeDocumentSettings>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
    </xml>
    <![endif]-->
    <style>
    /* Mobile tweaks for clients that honor <style> */
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; }
      .p-24 { padding: 16px !important; }
      .btn { width: 100% !important; display: block !important; }
    }
    </style>
  </head>
  <body style="margin:0; padding:0; background:#f5f7fb;">
    <!-- Preheader (hidden) -->
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
    Your virtual try-on is ready—view or download your new look.
    </div>

    <!-- Wrapper -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f7fb;">
    <tr>
      <td align="center" style="padding:30px 12px;">
      <!-- Card -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="width:600px; max-width:100%; background:#ffffff; border-radius:14px; box-shadow:0 6px 24px rgba(16,24,40,0.08);">
        <tr>
        <td class="p-24" style="padding:28px 24px 8px 24px; text-align:center;">
          <!-- Heading -->
          <h2 style="margin:0 0 10px 0; font-family:Arial,Helvetica,sans-serif; font-size:22px; line-height:1.3; color:#1f2937;">
          ✨Check out your virtual try-on!✨
          </h2>
          <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.6; color:#4b5563;">
          We've generated your new look for you. Preview it below and download in one click.
          </p>
        </td>
        </tr>

        <!-- Hero / Framed Image -->
        <tr>
        <td style="padding:18px 24px 0 24px;">
          <!-- Sparkle band -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td align="left" style="font-size:16px;">✴️</td>
            <td align="center" style="font-size:12px; color:#f59e0b; letter-spacing:0.3em; font-family:Arial,Helvetica,sans-serif;">— G L O W —</td>
            <td align="right" style="font-size:16px;">✴️</td>
          </tr>
          </table>

          <!-- Gold frame -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px;">
          <tr>
            <td style="border:3px solid #f4c430; border-radius:16px; box-shadow:0 0 0 4px rgba(244,196,48,0.12), 0 10px 22px rgba(17,24,39,0.08); padding:10px;">
            <img src="cid:transformation@aicrafters" alt="Your virtual try-on result" width="552" style="display:block; width:100%; height:auto; border-radius:12px; border:1px solid #f1f5f9;">
            </td>
          </tr>
          </table>

          <!-- Sparkle band bottom -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px;">
          <tr>
            <td align="left" style="font-size:14px;">✴️</td>
            <td align="center" style="font-size:12px; color:#9ca3af; font-family:Arial,Helvetica,sans-serif;">Created by AI Virtual Try-On Booth ✨</td>
            <td align="right" style="font-size:14px;">✴️</td>
          </tr>
          </table>
        </td>
        </tr>

        <!-- Note -->
        <tr>
        <td style="padding:16px 24px 0 24px;">
          <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.6; color:#6b7280; text-align:center;">
          This is a temporary preview link. Be sure to save your image if you'd like to keep it.
          </p>
        </td>
        </tr>

        <!-- Divider -->
        <tr>
        <td style="padding:24px;">
          <hr style="border:none; border-top:1px solid #e5e7eb; margin:0;">
        </td>
        </tr>

        <!-- Brand footer -->
        <tr>
        <td align="center" style="padding:6px 24px 26px 24px;">
          <a href="https://aicrafters.com/" target="_blank" style="text-decoration:none;">
          <img src="https://aicrafters.com/wp-content/uploads/2024/01/ai-crafters-logo-1-1.png" width="120" alt="AI Crafters" style="display:block; width:120px; height:auto; margin:0 auto 6px auto; opacity:0.9;">
          </a>
          <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:11px; color:#94a3b8;">
          Made by AI Crafters • <a href="https://aicrafters.com/" target="_blank" style="color:#64748b; text-decoration:underline;">aicrafters.com</a>
          </p>
        </td>
        </tr>
      </table>
      <!-- /Card -->
      </td>
    </tr>
    </table>
  </body>
  </html>`,
      attachments: [
    // Inline version (for display)
    {
      filename: "virtual-try-on.png",
      content: pngBuffer,
      contentType: "image/png",
      cid: "transformation@aicrafters"
    },
    // Attachment version (for download)
    {
      filename: "virtual-try-on.png",
      content: pngBuffer,
      contentType: "image/png",
      contentDisposition: "attachment"
    }]
    });

    res.json({ ok: true });
  } catch (e) {
    console.error('Email send failed:', e);
    res.status(500).json({ error: 'Email send failed', details: e.message });
  }
});



// ===== Global error handler =====
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// ===== Start server =====
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Magic Face Transform running at http://localhost:${PORT}`);
  console.log(`🤖 Runware configured: ${Boolean(RUNWARE_API_KEY)}`);
  console.log(`🎨 Fal.ai configured: ${Boolean(FAL_API_KEY && fal)}`);
  console.log(`🌐 Google Imagen configured: ${Boolean(process.env.GEMINI_API_KEY)}`);
});

module.exports = app;
