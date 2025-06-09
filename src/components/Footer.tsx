// src/components/Footer.tsx
import Link from "next/link";
import { Landmark, Github, Linkedin } from "lucide-react"; // Using Landmark as app icon

const Footer = () => {
  return (
    <footer className="bg-muted text-muted-foreground border-t border-border mt-auto">
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* App Info */}
          <div className="space-y-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-semibold text-primary"
            >
              <Landmark className="size-6" />
              <span>TaxSage AI</span>
            </Link>
            <p className="text-sm">
              Personalized tax saving suggestions powered by AI. Optimize your
              taxes smartly and efficiently.
            </p>
            <p className="text-xs">
              Disclaimer: TaxSage AI provides informational suggestions and
              estimates. Always consult a qualified tax professional for advice.
            </p>
          </div>
          {/* Quick Links (Optional - can add navigation links here if needed) */}
          {/* <div className="space-y-2">
            <h4 className="font-semibold text-foreground">Quick Links</h4>
            <ul className="space-y-1 text-sm">
              <li><Link href="/" className="hover:text-primary">Home</Link></li>
              <li><Link href="/report" className="hover:text-primary">Generate Report</Link></li>
              <li><Link href="/deductions" className="hover:text-primary">Deductions</Link></li>
            </ul>
          </div> */}
          <div></div> {/* Empty div for spacing if no middle column */}
          {/* Connect with Developer */}
          <div className="space-y-4 text-center md:text-right">
            <h4 className="font-semibold text-foreground">Connect with Us</h4>
            <div className="flex justify-center md:justify-end space-x-4">
              <Link
                href="https://github.com/ashutoshswamy"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="hover:text-primary"
              >
                <Github className="size-6" />
              </Link>
              <Link
                href="https://linkedin.com/in/ashutoshswamy"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="hover:text-primary"
              >
                <Linkedin className="size-6" />
              </Link>
            </div>
            <p className="text-sm">Developer: Ashutosh Swamy</p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border pt-6 text-center text-xs">
          © {new Date().getFullYear()} TaxSage AI. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
