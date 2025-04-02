import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

export default function Uses() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center  min-h-dvh p-8 pb-20 sm:p-20">
      <Link
        href="/"
        className="hover:underline hover:underline-offset-4 font-medium"
      >
        <ArrowLeftIcon className="inline size-4 align-middle mb-px mr-1" />
        Back
      </Link>
      <h1 className="text-3xl font-bold">/uses</h1>
      <h2 className="text-lg">last updated: 2/20/2025</h2>

      <br />

      <h2 className="text-2xl font-bold">desktop pc</h2>

      <ul className="list-disc list-inside">
        <li>
          CPU:{" "}
          <a
            href="https://amzn.to/3ZTsX4G"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            Intel i9-9900K
          </a>
        </li>
        <li>
          RAM:{" "}
          <a
            href="https://amzn.to/4fG1p8I"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            Corsair Vengence Pro 32GB 3200 MHz
          </a>
        </li>
        <li>
          GPU:{" "}
          <a
            href="https://amzn.to/4gFUopY"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            RTX 2070
          </a>
        </li>
        <li>OS: Windows 11 (with Ubuntu WSL)</li>
        <li>Storage:</li>
        <ul className="ml-10 list-disc list-inside">
          <li>
            NVME:{" "}
            <a
              href="https://amzn.to/40f2PTi"
              className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
            >
              WD_BLACK: 1TB
            </a>
          </li>
          <li>
            SSD:{" "}
            <a
              href="https://amzn.to/4i2qq05"
              className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
            >
              WD Blue: 1TB
            </a>
          </li>
        </ul>
        <li>
          Keyboard:{" "}
          <a
            href="https://www.keychron.com/products/keychron-v3-qmk-custom-mechanical-keyboard"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            Keychron V3 QMK, with Keychron K Pro Red switches
          </a>
        </li>
        <li>Mouse: Finalmouse Starlight-12 (Gold) - 400 DPI</li>
        <li>
          Headphones:{" "}
          <a
            href="https://amzn.to/4gAaJwk"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            PHILIPS SHP9500
          </a>
        </li>
        <li>
          Desktop Speakers:{" "}
          <a
            href="https://amzn.to/400wZZ3"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            Edifier R1280DB
          </a>
        </li>
        <li>
          Microphone:{" "}
          <a
            href="https://amzn.to/3PkMNRG"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            Elgato Wave:3
          </a>
        </li>
        <li>
          Microphone Arm:{" "}
          <a
            href="https://amzn.to/3PiaIAT"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            Elgato Wave Mic Arm LP
          </a>
        </li>
        <li>
          <a
            href="https://amzn.to/4gCDFUr"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            Elgato Stream Deck: MK.1
          </a>
          (linking the MK.2 because appearently the MK.1 is
          &apos;unsupported&apos; or whatever.......... but it works just fine,
          so if you can find a used one for a good price I say go for it, the
          differences between the MK.1 and the MK.2 are negligible.)
        </li>
        <li>
          Webcam:{" "}
          <a
            href="https://amzn.to/41WlxQE"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            Elgato Facecam MK.2
          </a>
        </li>
        <li>
          Capture Card:
          <a
            href="https://amzn.to/402YbXd"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            Elgato HD60 S+
          </a>
        </li>
        <li>
          Benchmark:{" "}
          <a
            href="https://www.userbenchmark.com/UserRun/69065736"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            Click Here
          </a>
        </li>
        <li>
          <a
            href="https://settings.gg/player/166736678"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            CS:GO Settings
          </a>
        </li>
      </ul>

      <br />

      <h2 className="text-2xl font-bold">laptop</h2>
      <ul className="list-disc list-inside">
        <li>
          Model:{" "}
          <a
            href="https://amzn.to/4iS6b61"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            Apple Macbook Air (Late 2020) - M1
          </a>
        </li>
        <li>CPU: Apple M1</li>
        <li>GPU: 8 Core GPU from M1</li>
        <li>RAM: 16GB</li>
        <li>Storage:</li>
        <ul className="ml-10 list-disc list-inside">
          <li>SSD: 500GB</li>
        </ul>
        <li>OS: macOS Sequoia</li>
      </ul>

      <br />

      <h2 className="text-2xl font-bold">daily mobile devices</h2>
      <ul className="list-disc list-inside">
        <li>
          Phone:{" "}
          <a
            href="https://amzn.to/41X8xKF"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            iPhone 16 Pro (128gb, Desert Titanium)
          </a>
        </li>
        <li>
          Watch:{" "}
          <a
            href="https://amzn.to/41YO3kY"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            Apple Watch Series 7 (41mm, Starlight, GPS + Cellular)
          </a>
        </li>
        <li>
          Headphones:{" "}
          <a
            href="https://amzn.to/40hXs5R"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            AirPods Pro 2
          </a>
        </li>
      </ul>

      <br />

      <h2 className="text-2xl font-bold">homelab NAS</h2>
      <ul className="list-disc list-inside">
        <li>
          CPU:{" "}
          <a
            href="https://amzn.to/3X9BiAJ"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            Intel i7-6700 CPU @ 3.40GHz
          </a>
        </li>
        <li>RAM: 16GB 2400 MHz</li>
        <li>
          GPU:{" "}
          <a
            href="https://amzn.to/4i4OKOg"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            GTX 1060 3GB
          </a>
        </li>
        <li>
          OS:{" "}
          <a
            href="https://www.truenas.com/truenas-scale?via=mmatt.net"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            TrueNAS Scale (ElectricEel-24.10.2)
          </a>
        </li>
        <li>Storage:</li>
        <ul className="ml-10 list-disc list-inside">
          <li>
            Boot Drive:{" "}
            <a
              href="https://amzn.to/437jVEh"
              className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
            >
              Crucial P3: 500GB
            </a>
          </li>
          <li>
            SSD (Unused):{" "}
            <a
              href="https://amzn.to/4baxUey"
              className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
            >
              Crucial MX500: 1TB
            </a>
          </li>
          <li>
            HDD:{" "}
            <a
              href="https://amzn.to/4bcNVk5"
              className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
            >
              Seagate IronWolf: 4TB
            </a>
          </li>
        </ul>
        <li>
          Software Running:{" "}
          <a
            href="https://filebrowser.org?via=mmatt.net"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            File Browser
          </a>
          ,{" "}
          <a
            href="https://git.mmatt.net/"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            Gitea
          </a>
          ,{" "}
          <a
            href="https://www.home-assistant.io?via=mmatt.net"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            Home Assistant
          </a>
          ,{" "}
          <a
            href="https://immich.app?via=mmatt.net"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            Immich
          </a>
          ,{" "}
          <a
            href="https://github.com/Jackett/Jackett?via=mmatt.net"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            Jackett
          </a>
          ,{" "}
          <a
            href="https://jellyfin.org?via=mmatt.net"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            Jellyfin
          </a>
          ,{" "}
          <a
            href="https://pi-hole.net?via=mmatt.net"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            Pi-hole
          </a>
          ,{" "}
          <a
            href="https://www.portainer.io?via=mmatt.net"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            Portainer
          </a>
          ,{" "}
          <a
            href="https://radarr.video?via=mmatt.net"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            Radarr
          </a>
          ,{" "}
          <a
            href="https://sonarr.tv?via=mmatt.net"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            Sonarr
          </a>
          ,{" "}
          <a
            href="https://tailscale.com?via=mmatt.net"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            Tailscale
          </a>
          .
        </li>
      </ul>

      <br />

      <h2 className="text-2xl font-bold">consoles</h2>
      <ul className="list-disc list-inside">
        <li>
          <a
            href="https://amzn.to/4j1PDIE"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            Xbox 360 w/ Kinect
          </a>{" "}
          (I can&apos;t believe this is still sold on Amazon)
        </li>
        <li>
          <a
            href="https://amzn.to/4j23yyG"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            Wii U
          </a>
        </li>
        <li>
          <a
            href="https://amzn.to/4a09kfP"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            Xbox One
          </a>
        </li>
        <li>
          <a
            href="https://amzn.to/4iV6cG9"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            PlayStation 4
          </a>
        </li>
        <li>
          <a
            href="https://amzn.to/49XMhm3"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            Nintendo Switch
          </a>
        </li>
        <li>
          <a
            href="https://amzn.to/4fKTXJs"
            className="transition-all text-blue-400 hover:bg-blue-400/50 hover:text-white hover:p-0.5 hover:rounded"
          >
            PlayStation 5
          </a>
        </li>
      </ul>

      <br />

      <p>
        the above links <b>are</b> affiliate links.
      </p>
    </div>
  );
}
