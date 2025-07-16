# MCP OpenAI Image Server - Installation Guide

## Prerequisites

- Node.js 18+ installed
- OpenAI API key
- Claude CLI installed and configured
- Write permissions to Desktop directory

## Installation Steps

### 1. Install the MCP Server Globally

```bash
# Navigate to the project directory
cd /Users/saf/dev/mcp-openai-image

# Install dependencies and build
npm install
npm run build

# Create global symlink
npm link
```

### 2. Configure Claude CLI

```bash
# Add the MCP server to Claude CLI
claude mcp add mcp-openai-image mcp-openai-image

# Verify installation
claude mcp list
claude mcp get mcp-openai-image
```

### 3. Test the Integration

```bash
# Test that Claude can see the server
claude "Check if the mcp-openai-image server is available and list its tools"
```

## Available Tools

Once integrated, you'll have access to these tools through Claude:

### 1. `configure-server`
Configure your OpenAI API key and settings.

**Parameters:**
- `apiKey` (required): Your OpenAI API key
- `organization` (optional): OpenAI organization ID  
- `model` (optional): Model to use (default: gpt-4.1-mini)

**Example:**
```
Configure the OpenAI image server with API key sk-your-key-here
```

### 2. `generate-image`
Generate images using OpenAI's image generation API.

**Parameters:**
- `prompt` (required): Image description
- `size` (optional): Image dimensions (1024x1024, 1024x1536, 1536x1024)
- `quality` (optional): Image quality (standard, hd)
- `format` (optional): Output format (png, jpeg, webp)
- `background` (optional): Background setting (transparent, opaque, auto)
- `compression` (optional): Compression level for JPEG/WebP (0-100)

**Example:**
```
Generate an image of a serene mountain landscape with a lake
```

### 3. `edit-image`
Edit existing images using multi-turn editing.

**Parameters:**
- `editPrompt` (required): Edit instructions
- `previousResponseId` (optional): Previous response ID
- `imageId` (optional): Specific image ID to edit

**Example:**
```
Edit the last generated image to add a sunset in the background
```

### 4. `stream-image`
Generate images with streaming for faster feedback.

**Parameters:**
- `prompt` (required): Image description
- `partialImages` (optional): Number of partial images (1-3)
- `size` (optional): Image dimensions

**Example:**
```
Stream generate an image of a futuristic city with 2 partial images
```

### 5. `get-config-status`
Check the current configuration status.

**Example:**
```
Check the configuration status of the OpenAI image server
```

### 6. `list-supported-models`
List all supported OpenAI models.

**Example:**
```
List all supported models for image generation
```

## Usage Workflow

### First Time Setup

1. **Configure API Key:**
   ```
   Configure the OpenAI image server with API key sk-your-actual-key-here
   ```

2. **Check Status:**
   ```
   Check the configuration status of the OpenAI image server
   ```

3. **Generate Your First Image:**
   ```
   Generate an image of a peaceful garden with cherry blossoms
   ```

### Regular Usage

1. **Generate Images:**
   ```
   Generate a high-quality PNG image of a robot playing chess, size 1024x1536
   ```

2. **Edit Images:**
   ```
   Edit the last image to make the robot have blue eyes
   ```

3. **Stream for Faster Feedback:**
   ```
   Stream generate an image of a dragon flying over a castle
   ```

## File Management

- **Images Location:** All generated images are automatically saved to `~/Desktop`
- **File Naming:** Images use the format `openai-image-{timestamp}-{randomId}.{extension}`
- **Metadata:** Each image has a corresponding `.json` file with generation details
- **Cleanup:** Old images are automatically cleaned up (keeps last 50)

## Troubleshooting

### Server Not Found
```bash
# Check if server is globally available
which mcp-openai-image

# If not found, reinstall
npm link
```

### Permission Issues
```bash
# Grant permissions when Claude asks
# Or check server status
claude mcp get mcp-openai-image
```

### Configuration Issues
```bash
# Check configuration
claude "Check the configuration status of the OpenAI image server"

# Reconfigure if needed
claude "Configure the OpenAI image server with API key sk-your-new-key"
```

### Desktop Access Issues
```bash
# Check Desktop permissions
ls -la ~/Desktop

# Create Desktop directory if missing
mkdir -p ~/Desktop
```

## Advanced Configuration

### Custom Model Selection
```
Configure the OpenAI image server with API key sk-your-key and model gpt-4.1
```

### Organization Support
```
Configure the OpenAI image server with API key sk-your-key and organization org-your-org-id
```

### Quality and Format Options
```
Generate a high-quality JPEG image with 80% compression of a sunset over the ocean
```

## Uninstallation

```bash
# Remove from Claude CLI
claude mcp remove mcp-openai-image

# Remove global symlink
npm unlink -g mcp-openai-image
```

## Support

For issues or questions:
1. Check the configuration status first
2. Verify API key is valid
3. Ensure Desktop directory is writable
4. Check Claude CLI logs for errors

## Security Notes

- API keys are stored securely in the server's internal configuration
- No API keys are logged or exposed in responses
- All generated images are saved locally to your Desktop
- The server validates all inputs before processing