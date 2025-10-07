# 🎨 AI Digital Try-On Studio

Transform your photos with AI-powered outfit customization. Capture a full-body photo, choose clothing and accessories from visual presets, and generate a personalized look using advanced AI image generation.

## ✨ Features

### 📸 Full-Body Capture
- **16:9 Vertical Camera**: Optimized for standing full-body portraits
- **Body Shadow Guide**: Visual alignment helper for proper positioning
- **Auto-Countdown**: Hands-free photo capture
- **Upload Option**: Use existing photos from your device

### 👔 Modern Avatar Editor
- **Split-Screen Layout**: Clean interface with avatar preview and category editor
- **9 Customization Categories**: 
  - 👖 Lower Body (jeans, pants, skirts)
  - 👕 Upper Body (shirts, hoodies, t-shirts)
  - 🧥 Outerwear (jackets, coats, blazers)
  - 👟 Footwear (sneakers, boots, heels)
  - 👓 Eyewear (sunglasses, frames)
  - 🧢 Headwear (caps, beanies, hats)
  - 💎 Accessories (watches, jewelry, scarves)
  - 👜 Bags (backpacks, handbags, totes)
  - 🌆 Background (studio, city, park, beach)

### 🖼️ Image-Based Preset System
- **63 Pre-loaded Items**: Real product photos with professional styling
- **Horizontal Carousel**: Smooth navigation with arrow buttons
- **Visual Selection**: Green highlights and checkmarks for chosen items
- **Custom Descriptions**: Type your own outfit descriptions for any category

### 🤖 Dual Prompt Modes
- **Per-Item Mode**: Combine multiple selections across categories
- **General Prompt Mode**: Describe your entire outfit in one text prompt
- **Smart Override**: General prompt takes priority when enabled

### 🎯 AI Provider Support
- **Runware** (Primary): Fast, high-quality image transformations
- **Fal.ai** (Fallback): Alternative provider with Kontext Edit
- **Google Imagen** (Backup): Reliable generation with Gemini API

### 📤 Sharing Options
- **Email**: Send results with embedded images via SMTP
- **QR Code**: Generate scannable codes for mobile sharing
- **Direct Links**: imgbb integration for shareable URLs

### 📱 Fully Responsive
- **Desktop**: Split-screen layout with full preview
- **Tablet**: Optimized spacing and card sizes
- **Mobile**: Single-column stack, swipe-enabled carousel
- **No Scrolling**: Everything fits viewport on all screen sizes

## 🚀 Quick Start

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/ai-digital-try-on.git

# Navigate to project
cd ai-digital-try-on

# Install dependencies
npm install

# Start the server
npm start
```

Server runs at **http://localhost:3000**

### Environment Setup
Create a `.env` file in the root directory:

```env
# AI Provider Keys (at least one required)
RUNWARE_API_KEY=your_runware_key
FAL_API_KEY=your_fal_key
GEMINI_API_KEY=your_gemini_key

# Image Upload (optional)
IMGBB_API_KEY=your_imgbb_key

# Email Sharing (optional)
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=Your Name <your_email@gmail.com>
```

## 🎮 Usage

### 1. Capture Photo
- Click **"Start Virtual Fitting"** on welcome screen
- Allow camera permissions
- Position yourself in frame using the body shadow guide
- Wait for countdown or click capture button

### 2. Customize Look
- **Select Categories**: Click tabs (👖 👕 🧥 etc.) to switch categories
- **Choose Presets**: Click image cards to select items
- **Custom Items**: Type descriptions in input field and press Enter
- **View Selections**: See all choices as tags in the left panel
- **Remove Items**: Click × on any tag to deselect

### 3. Choose Prompt Mode
- **Per-Item Mode** (default): Uses individual selections from categories
- **General Prompt Mode**: Check the box and type complete outfit description

### 4. Generate Result
- Click **"Render Look ✨"** button
- AI processes image (typically 10-30 seconds)
- View transformed photo on result screen

### 5. Share
- Download image directly
- Send via email (requires SMTP configuration)
- Share QR code for mobile access
- Copy shareable link

## 📁 Project Structure

```
AI-Photo-Booth-main/
├── server.js                 # Express server with AI provider routes
├── package.json              # Dependencies and scripts
├── .env                      # Environment variables (gitignored)
├── public/
│   ├── index.html            # Main HTML structure
│   ├── css/
│   │   └── style.css         # Responsive styles with breakpoints
│   ├── js/
│   │   ├── app.js            # Frontend logic and state management
│   │   └── characters.json   # Legacy character data
│   ├── data/
│   │   └── wardrobe.json     # All clothing items and categories
│   └── images/
│       └── characters/       # Image assets
└── vercel.json               # Vercel deployment config
```

## 🔧 Customization

### Adding New Wardrobe Items

Edit `public/data/wardrobe.json`:

```json
{
  "id": "unique-item-id",
  "name": "Display Name",
  "image": "https://images.unsplash.com/photo-xxx?w=400",
  "prompt": "detailed description for AI generation"
}
```

**Image Sources:**
- [Unsplash](https://unsplash.com) - Free high-quality photos
- [Pexels](https://pexels.com) - Free stock photos
- Your own hosted images

**Prompt Tips:**
- Include color, material, and style
- Describe key features (pockets, zippers, fit)
- Use action words ("wearing", "carrying")
- Be specific but concise

### Adding New Categories

In `public/js/app.js`, modify `buildAccessoryDefinitions()`:

```javascript
{
  id: 'category-id',
  emoji: '🎭',
  label: 'Category Name',
  presets: [
    { value: 'preset1', label: 'Option 1' },
    // ...
  ]
}
```

Then add corresponding items to `wardrobe.json`.

## 🎨 Keyboard Shortcuts

- **1-9**: Switch to category tabs (1=Lower Body, 2=Upper Body, etc.)
- **Esc**: Clear current category selection
- **Enter**: Add custom item description
- **Ctrl+Enter** / **Cmd+Enter**: Render look

## 🔌 API Endpoints

- `GET /api/health` - Check provider configuration status
- `POST /api/transform/runware` - Transform image via Runware
- `POST /api/transform/fal` - Transform image via Fal.ai
- `POST /api/transform/google` - Transform image via Google Imagen
- `POST /api/send-email` - Send result via email

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Backend**: Node.js, Express
- **AI Providers**: Runware, Fal.ai, Google Generative AI
- **Image Handling**: Sharp, Base64 encoding
- **Email**: Nodemailer with HTML templates
- **Styling**: CSS Grid, Flexbox, Custom animations

## 📱 Browser Support

- Chrome/Edge (recommended): Full support
- Firefox: Full support
- Safari: Full support (iOS 14.5+)
- Mobile browsers: Optimized for touch

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Credits

- Product photos from [Unsplash](https://unsplash.com)
- Icons and emojis: Unicode standard
- AI providers: Runware, Fal.ai, Google

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Check existing documentation
- Review API provider documentation

---

**Made with ❤️ for the fashion-forward and tech-savvy**
