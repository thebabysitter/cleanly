import Image from 'next/image';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-center ${className}`}>
      {/* 
        This expects a file at public/logo.png.
        If the user hasn't uploaded it yet, this might break or show broken image.
        We can use an onError or just instructions.
      */}
      <Image
        src="/logo.png"
        alt="dustfree"
        width={180}
        height={50}
        className="w-auto h-auto object-contain"
        priority
      />
    </div>
  );
}





