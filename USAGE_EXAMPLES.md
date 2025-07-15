# MCP OpenAI Image Server - Usage Examples

## Quick Start Examples

### Basic Image Generation
```
Generate an image of a cute cat sitting on a windowsill
```

### High-Quality Image
```
Generate a high-quality image of a futuristic cityscape at night, size 1024x1536
```

### Specific Format
```
Generate a JPEG image with 90% compression of a tropical beach scene
```

### Transparent Background
```
Generate a PNG image with transparent background of a red apple
```

## Advanced Usage Examples

### Multi-Turn Image Editing
```
# First, generate an image
Generate an image of a simple house with a red roof

# Then edit it
Edit the last image to add a garden in front of the house

# Continue editing
Edit the image to add a blue sky with white clouds

# Add more details
Edit the image to add a white picket fence around the garden
```

### Streaming for Real-Time Feedback
```
Stream generate an image of a dragon breathing fire with 3 partial images
```

### Configuration Examples
```
# Basic configuration
Configure the OpenAI image server with API key sk-your-key-here

# With organization
Configure the OpenAI image server with API key sk-your-key-here and organization org-your-org-id

# With specific model
Configure the OpenAI image server with API key sk-your-key-here and model gpt-4.1
```

## Creative Prompts

### Artistic Styles
```
Generate an image of a mountain landscape in the style of Van Gogh
Generate a photorealistic portrait of an elderly man with kind eyes
Generate an abstract geometric pattern with vibrant colors
Generate a watercolor painting of a forest in autumn
```

### Detailed Scenes
```
Generate an image of a cozy library with wooden shelves full of books, warm lighting, and a reading chair by a window
Generate an image of a bustling marketplace in medieval times with merchants, colorful tents, and cobblestone streets
Generate an image of a serene Japanese garden with a koi pond, bamboo, and cherry blossoms
```

### Technical Specifications
```
Generate a high-quality PNG image of a modern office space, size 1536x1024, with natural lighting
Generate a JPEG image with 85% compression of a product shot of a smartphone on a white background
Generate a WebP image of a logo design with transparent background
```

## Workflow Examples

### Design Iteration Workflow
```
# Initial concept
Generate an image of a logo for a coffee shop with a minimalist design

# Refine the concept
Edit the logo to make it more circular and add coffee beans

# Color variations
Edit the logo to use brown and cream colors

# Final touches
Edit the logo to add the text "Daily Brew" underneath
```

### Content Creation Workflow
```
# Hero image
Generate a high-quality image of a professional workspace for a blog header, size 1024x1536

# Supporting images
Generate an image of hands typing on a laptop keyboard
Generate an image of a coffee cup on a desk with notes

# Social media versions
Generate a square image of the workspace optimized for Instagram
```

### Product Development Workflow
```
# Concept visualization
Generate an image of a futuristic smartwatch with a sleek design

# Feature exploration
Edit the watch to add a heart rate sensor on the back
Edit the watch to show a weather app on the display

# Color variants
Edit the watch to have a black metal band
Edit the watch to have a sport silicone band in blue
```

## Status and Maintenance

### Check Server Status
```
Check the configuration status of the OpenAI image server
```

### List Available Models
```
List all supported models for image generation
```

### Monitor Generation History
Generated images are saved to `~/Desktop` with timestamps, making it easy to track your generation history.

## Error Handling Examples

### API Key Issues
```
# If you get API key errors, reconfigure:
Configure the OpenAI image server with API key sk-your-new-key-here
```

### Quality Issues
```
# If images are low quality, specify higher quality:
Generate a high-quality image of a sunset over the ocean
```

### Size Issues
```
# If default size doesn't work, specify explicitly:
Generate an image of a castle, size 1024x1024
```

## Best Practices

### Prompt Writing
- Be specific about what you want
- Include style, mood, and technical requirements
- Use descriptive adjectives
- Specify lighting, composition, and perspective

### Quality Optimization
- Use "high-quality" for better results
- Specify appropriate size for your use case
- Choose the right format (PNG for transparency, JPEG for photos)
- Use compression settings for file size optimization

### Iteration Strategy
- Start with a simple concept
- Use edit-image for refinements
- Save intermediate results you like
- Build complexity gradually

### Organization
- Check generated images in ~/Desktop regularly
- Use descriptive prompts for easier identification
- Consider the JSON metadata files for detailed information
- Clean up old images periodically (automatic cleanup keeps last 50)

## Integration with Other Tools

### With Claude Desktop
- Use the same server configuration
- Images are immediately available in Desktop
- Can be referenced in follow-up conversations

### With Development Workflows
- Generate placeholder images for UI development
- Create icons and graphics for applications
- Generate marketing materials and mockups

### With Content Creation
- Generate blog post headers and illustrations
- Create social media graphics
- Generate concept art for projects