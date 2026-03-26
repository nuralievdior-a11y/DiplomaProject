export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',800:'#1e40af',900:'#1e3a8a' },
        accent: { 50:'#fdf4ff',100:'#fae8ff',200:'#f5d0fe',300:'#f0abfc',400:'#e879f9',500:'#d946ef',600:'#c026d3',700:'#a21caf',800:'#86198f',900:'#701a75' },
        neutral: { 50:'#fafafa',100:'#f5f5f5',200:'#e5e5e5',300:'#d4d4d4',400:'#a3a3a3',500:'#737373',600:'#525252',700:'#404040',800:'#262626',900:'#171717',950:'#0a0a0a' }
      },
      fontFamily: {
        display: ['Outfit','system-ui','sans-serif'],
        body: ['DM Sans','system-ui','sans-serif']
      },
      animation: {
        'fade-in': 'fadeIn .5s ease-out forwards',
        'slide-up': 'slideUp .5s ease-out forwards',
        'float': 'float 3s ease-in-out infinite'
      },
      keyframes: {
        fadeIn: { from: { opacity:'0' }, to: { opacity:'1' } },
        slideUp: { from: { opacity:'0', transform:'translateY(20px)' }, to: { opacity:'1', transform:'translateY(0)' } },
        float: { '0%,100%': { transform:'translateY(0)' }, '50%': { transform:'translateY(-10px)' } }
      }
    }
  },
  plugins: []
}
