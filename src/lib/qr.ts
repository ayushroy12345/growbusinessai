import QRCode from 'qrcode';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * Generate a base64 Data URL for a QR code targeting a URL
 */
export async function generateQRCodeDataUrl(
  text: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const defaultOptions: QRCode.QRCodeToDataURLOptions = {
    width: options.width || 360,
    margin: options.margin !== undefined ? options.margin : 2,
    color: {
      dark: options.color?.dark || '#1e1b4b',
      light: options.color?.light || '#ffffff',
    },
    errorCorrectionLevel: 'M',
  };

  try {
    return await QRCode.toDataURL(text, defaultOptions);
  } catch (err) {
    console.error('Failed to generate QR Code:', err);
    throw new Error('QR Code generation failed');
  }
}

/**
 * Generate an SVG string for a QR code targeting a URL
 */
export async function generateQRCodeSVG(
  text: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const defaultOptions: QRCode.QRCodeToStringOptions = {
    type: 'svg',
    width: options.width || 360,
    margin: options.margin !== undefined ? options.margin : 2,
    color: {
      dark: options.color?.dark || '#1e1b4b',
      light: options.color?.light || '#ffffff',
    },
    errorCorrectionLevel: 'M',
  };

  try {
    return await QRCode.toString(text, defaultOptions);
  } catch (err) {
    console.error('Failed to generate SVG QR Code:', err);
    throw new Error('SVG QR Code generation failed');
  }
}
