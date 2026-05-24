import Document, { Html, Head, Main, NextScript } from 'next/document';

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="en" className="bg-[#050816] text-white">
        <Head>
          {/* Preconnect and preload fonts for premium typography */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
            rel="stylesheet"
          />
          {/* Meta tags for SEO and dark mode support */}
          <meta name="theme-color" content="#050816" />
        </Head>
        <body className="bg-[#050816] antialiased">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
