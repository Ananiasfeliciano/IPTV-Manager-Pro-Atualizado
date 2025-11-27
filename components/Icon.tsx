import React from 'react';

type IconName = 'home' | 'users' | 'calendar' | 'server-stack' | 'play-circle' | 'user-group' | 'currency-dollar' | 'exclamation-circle' | 'check-circle' | 'exclamation-triangle' | 'x-mark' | 'whatsapp' | 'light-bulb' | 'chart-pie' | 'sparkles' | 'qr-code' | 'arrow-path' | 'shield-check' | 'banknotes' | 'bars-3';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
}

// FIX: Removed explicit type annotation `Record<IconName, string | JSX.Element>` to resolve "Cannot find namespace 'JSX'" error. Type is now inferred.
const iconPaths = {
  home: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" />,
  users: <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-4.663M12 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />,
  calendar: <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18M12 12.75h.008v.008H12v-.008zm0 4.5h.008v.008H12v-.008zM9.75 12.75h.008v.008H9.75v-.008zm0 4.5h.008v.008H9.75v-.008zm4.5-4.5h.008v.008H14.25v-.008zm0 4.5h.008v.008H14.25v-.008z" />,
  'server-stack': <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3.75v3.75m-3.75-3.75v3.75m-3.75-3.75v3.75m9.75-15l-2.071 2.071m0 0l-2.071 2.071M7.5 7.5l2.071 2.071M7.5 7.5l-2.071 2.071m4.142-4.142l2.071 2.071M12 3v.01M16.5 7.5l-2.071 2.071m0 0l-2.071 2.071M16.5 7.5l2.071 2.071m-4.142-4.142l2.071 2.071M12 21v-.01M4.5 12.75v-.01M4.5 12.75v.01M4.5 12.75v-.01M4.5 12.75v.01M19.5 12.75v-.01M19.5 12.75v.01M19.5 12.75v-.01M19.5 12.75v.01" />,
  'play-circle': <><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" /></>,
  'user-group': <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5-2.228a4.5 4.5 0 00-1.002-2.228M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  'currency-dollar': <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  'exclamation-circle': <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />,
  'check-circle': <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  'exclamation-triangle': <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />,
  'x-mark': <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />,
  whatsapp: <path d="M19.11 4.91C17.22 3 14.71 2 12 2C6.48 2 2 6.48 2 12c0 1.77.46 3.45 1.32 4.95L2 22l5.27-1.38c1.45.79 3.08 1.21 4.73 1.21c5.52 0 10-4.48 10-10c0-2.71-1-5.22-2.89-7.09zM12 20.2c-1.54 0-3-.4-4.33-1.12L6.9 18.66l-3.57.94l.96-3.48l-.5-1.02C3.22 14.15 2.81 12.6 2.81 11c0-4.97 4.03-9 9-9c2.44 0 4.73.94 6.45 2.65C20.14 6.32 21 8.56 21 11c0 4.97-4.03 9-9 9zm4.21-6.52c-.22-.11-1.3-.65-1.5-.72c-.2-.07-.35-.11-.49.11c-.15.22-.57.72-.7 1.05c-.12.32-.24.37-.45.25c-.21-.12-.89-.33-1.69-1.04c-.63-.57-1.04-1.28-1.17-1.49c-.12-.21-.01-.32.1-.42c.1-.1.22-.26.33-.39c.12-.13.16-.21.24-.36c.08-.15.04-.28-.02-.39c-.06-.11-.49-1.18-.67-1.61c-.18-.42-.36-.36-.49-.37c-.12-.01-.27-.01-.42-.01s-.42.06-.64.31c-.22.25-.85.83-.85 2.01c0 1.18.87 2.33 1 2.49c.12.16 1.71 2.61 4.14 3.63c.59.25 1.05.4 1.41.51c.56.17 1.07.14 1.46.09c.44-.06 1.3-.53 1.48-1.03c.19-.5.19-.93.13-1.03c-.06-.11-.21-.16-.43-.27z" />,
  'light-bulb': <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a3 3 0 00-3-3m3 3a3 3 0 003-3m-3 3V1.5m9 4.5h.008v.008H21v-.008zM3 6h.008v.008H3V6zm18 6h.008v.008H21v-.008zM3 12h.008v.008H3v-.008zm12-9h.008v.008H15V3zm-6 0h.008v.008H9V3z" />,
  'chart-pie': <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />,
  sparkles: <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.572L16.25 21.75l-.648-1.178a2.625 2.625 0 01-1.823-1.823L12.602 18l1.178-.648a2.625 2.625 0 011.823-1.823L16.25 14.25l.648 1.178a2.625 2.625 0 011.823 1.823L19.898 18l-1.178.648a2.625 2.625 0 01-1.823 1.823z" />,
  'qr-code': <><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5a.75.75 0 00-.75.75v13.5a.75.75 0 00.75.75h13.5a.75.75 0 00.75-.75V5.25a.75.75 0 00-.75-.75H3.75zM9 9h6v6H9V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 10.5v3m3-3v3M3.75 9h.008v.008H3.75V9zm.75.75h.008v.008H4.5v-.008zm0-.75h.008v.008H4.5V9zm.75 0h.008v.008H5.25V9zM9 3.75h.008v.008H9V3.75zm.75.75h.008v.008H9.75v-.008zm0-.75h.008v.008H9.75V3.75zm.75 0h.008v.008H10.5V3.75zM15 3.75h.008v.008H15V3.75zm.75.75h.008v.008H15.75v-.008zm0-.75h.008v.008H15.75V3.75zm.75 0h.008v.008H16.5V3.75zM3.75 15h.008v.008H3.75V15zm.75.75h.008v.008H4.5v-.008zm0-.75h.008v.008H4.5V15zm.75 0h.008v.008H5.25V15z" /></>,
  'arrow-path': <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />,
  'shield-check': <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />,
  'banknotes': <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />,
  'bars-3': <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
};

export const Icon: React.FC<IconProps> = ({ name, className = "w-6 h-6", ...props }) => {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5"
      viewBox="0 0 24 24" 
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      {iconPaths[name]}
    </svg>
  );
};