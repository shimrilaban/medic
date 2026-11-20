import { Router, type Request, type Response } from "express";
import { getPrismaClient } from "../services/prismaClient.js";
import {
  searchNearbyPharmacies,
  type PharmacySearchInput,
  type PharmacySearchResult,
} from "../services/pharmacySearch.js";

type SimulationRequest = {
  query?: unknown;
  lat?: unknown;
  lng?: unknown;
  constituency?: unknown;
  areaName?: unknown;
  radiusKm?: unknown;
};

export type SimulatorDependencies = {
  searchPharmacies(input: PharmacySearchInput): Promise<PharmacySearchResult[]>;
  listMedicines(): Promise<MedicineOption[]>;
};

export type MedicineOption = {
  id: string;
  genericName: string;
  brandName: string | null;
  strength: string;
  dosageForm: string;
  packSize: string;
  category: string;
};

export type AreaOption = {
  name: string;
  lat: number;
  lng: number;
};

export type ConstituencyOption = {
  name: string;
  areas: AreaOption[];
};

export const nairobiConstituencies: ConstituencyOption[] = [
  {
    name: "Starehe",
    areas: [
      { name: "CBD / Moi Avenue", lat: -1.2820393, lng: 36.8213899 },
      { name: "Ngara", lat: -1.2751, lng: 36.8242 },
      { name: "Pangani", lat: -1.2739, lng: 36.839 },
      { name: "Kariokor", lat: -1.2782, lng: 36.8377 },
    ],
  },
  {
    name: "Westlands",
    areas: [
      { name: "Westlands Roundabout", lat: -1.264499, lng: 36.802143 },
      { name: "Parklands", lat: -1.263, lng: 36.8174 },
      { name: "Kilimani / Kileleshwa border", lat: -1.286, lng: 36.787 },
      { name: "Kangemi", lat: -1.2667, lng: 36.7465 },
      { name: "Mountain View", lat: -1.267, lng: 36.759 },
    ],
  },
  {
    name: "Lang'ata",
    areas: [
      { name: "Lang'ata Road / Galleria", lat: -1.3619, lng: 36.7592 },
      { name: "Karen", lat: -1.3283746, lng: 36.7049676 },
      { name: "South C", lat: -1.3216, lng: 36.8275 },
      { name: "Nairobi West", lat: -1.3091, lng: 36.8268 },
    ],
  },
  {
    name: "Kasarani",
    areas: [
      { name: "Kasarani / Mwiki", lat: -1.2124598, lng: 36.8829731 },
      { name: "Clay City", lat: -1.2045, lng: 36.8895 },
      { name: "Kahawa West", lat: -1.183, lng: 36.9075 },
      { name: "Njiru", lat: -1.237, lng: 36.941 },
      { name: "Ruai", lat: -1.266, lng: 37.0016 },
    ],
  },
  {
    name: "Roysambu",
    areas: [
      { name: "Roysambu", lat: -1.2185, lng: 36.8869 },
      { name: "Kahawa West", lat: -1.183, lng: 36.9075 },
      { name: "Zimmerman", lat: -1.2205, lng: 36.884 },
      { name: "Githurai 44", lat: -1.1979, lng: 36.9149 },
    ],
  },
  {
    name: "Dagoretti North",
    areas: [
      { name: "Kilimani / Kileleshwa border", lat: -1.286, lng: 36.787 },
      { name: "Kileleshwa", lat: -1.278, lng: 36.786 },
      { name: "Kawangware", lat: -1.2825, lng: 36.7578 },
      { name: "Gatina", lat: -1.281, lng: 36.751 },
    ],
  },
  {
    name: "Dagoretti South",
    areas: [
      { name: "Riruta", lat: -1.2978, lng: 36.7421 },
      { name: "Waithaka", lat: -1.3061, lng: 36.7194 },
      { name: "Mutuini", lat: -1.315, lng: 36.721 },
      { name: "Ngando", lat: -1.307, lng: 36.751 },
    ],
  },
  {
    name: "Embakasi East",
    areas: [
      { name: "Utawala", lat: -1.2781, lng: 36.9754 },
      { name: "Pipeline", lat: -1.313, lng: 36.885 },
      { name: "Embakasi", lat: -1.321, lng: 36.908 },
      { name: "Upper Savannah", lat: -1.306, lng: 36.913 },
    ],
  },
  {
    name: "Embakasi West",
    areas: [
      { name: "Umoja I", lat: -1.282, lng: 36.894 },
      { name: "Umoja II", lat: -1.274, lng: 36.9 },
      { name: "Mowlem", lat: -1.268, lng: 36.892 },
    ],
  },
  {
    name: "Embakasi Central",
    areas: [
      { name: "Kayole North", lat: -1.274, lng: 36.921 },
      { name: "Kayole Central", lat: -1.28, lng: 36.92 },
      { name: "Kayole South", lat: -1.286, lng: 36.92 },
      { name: "Komarock", lat: -1.262, lng: 36.913 },
    ],
  },
  {
    name: "Embakasi South",
    areas: [
      { name: "Imara Daima", lat: -1.329, lng: 36.866 },
      { name: "Kwa Njenga", lat: -1.316, lng: 36.89 },
      { name: "Mukuru Kwa Reuben", lat: -1.304, lng: 36.873 },
    ],
  },
  {
    name: "Embakasi North",
    areas: [
      { name: "Dandora Phase 1", lat: -1.248, lng: 36.899 },
      { name: "Dandora Phase 4", lat: -1.244, lng: 36.907 },
      { name: "Kariobangi North", lat: -1.252, lng: 36.875 },
    ],
  },
  {
    name: "Makadara",
    areas: [
      { name: "Makongeni", lat: -1.294, lng: 36.842 },
      { name: "Maringo", lat: -1.295, lng: 36.847 },
      { name: "Viwandani", lat: -1.305, lng: 36.851 },
      { name: "Harambee", lat: -1.298, lng: 36.858 },
    ],
  },
  {
    name: "Kamukunji",
    areas: [
      { name: "Eastleigh", lat: -1.275, lng: 36.848 },
      { name: "Pumwani", lat: -1.286, lng: 36.84 },
      { name: "California", lat: -1.271, lng: 36.852 },
      { name: "Airbase", lat: -1.267, lng: 36.864 },
    ],
  },
  {
    name: "Mathare",
    areas: [
      { name: "Huruma", lat: -1.257, lng: 36.856 },
      { name: "Mlango Kubwa", lat: -1.268, lng: 36.856 },
      { name: "Kiamaiko", lat: -1.259, lng: 36.866 },
      { name: "Mabatini", lat: -1.267, lng: 36.849 },
    ],
  },
  {
    name: "Kibra",
    areas: [
      { name: "Laini Saba", lat: -1.313, lng: 36.788 },
      { name: "Lindi", lat: -1.306, lng: 36.787 },
      { name: "Makina", lat: -1.31, lng: 36.783 },
      { name: "Woodley", lat: -1.296, lng: 36.78 },
    ],
  },
  {
    name: "Ruaraka",
    areas: [
      { name: "Baba Dogo", lat: -1.238, lng: 36.877 },
      { name: "Korogocho", lat: -1.246, lng: 36.899 },
      { name: "Lucky Summer", lat: -1.227, lng: 36.888 },
      { name: "Mathare North", lat: -1.251, lng: 36.865 },
    ],
  },
];

const simulatorPage = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MediCompare WA Simulator</title>
  <style>
    :root {
      color-scheme: light;
      font-family: Arial, sans-serif;
      color: #17231d;
      min-height: 100%;
      background-color: #24352f;
      background-image:
        linear-gradient(rgba(12, 35, 29, .3), rgba(12, 35, 29, .42)),
        url("/images/simulator-background.jfif");
      background-position: center center;
      background-repeat: no-repeat;
      background-size: cover;
      background-attachment: fixed;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: transparent;
    }
    .phone { width: min(100%, 440px); min-height: 690px; overflow: hidden; border: 10px solid #26342c; border-radius: 30px; background: #efe9df; box-shadow: 0 18px 60px #19352330; }
    header { padding: 18px 20px; background: #087c68; color: white; }
    header h1 { margin: 0; font-size: 19px; }
    header p { margin: 5px 0 0; font-size: 13px; opacity: .9; }
    main { padding: 18px; }
    .intro, .bubble, .result { border-radius: 14px; padding: 13px 15px; }
    .intro { background: white; line-height: 1.45; font-size: 14px; }
    form { display: grid; gap: 12px; margin: 16px 0; }
    label { display: grid; gap: 6px; font-size: 13px; font-weight: 700; }
    input, select { width: 100%; padding: 11px 12px; border: 1px solid #c8d1ca; border-radius: 8px; background: white; font: inherit; }
    .medicine-list { height: 132px; overflow-y: auto; padding: 4px; }
    .category-pills { display: flex; flex-wrap: wrap; gap: 6px; }
    .category-pill { padding: 7px 10px; border: 1px solid #087c68; background: white; color: #087c68; font-size: 11px; }
    .category-pill[aria-pressed="true"] { background: #087c68; color: white; }
    .picker-note { margin: -5px 0 0; color: #566158; font-size: 11px; }
    .coords { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .coords select { height: 132px; overflow-y: auto; padding: 4px; }
    .coords option { padding: 5px 4px; }
    .location-note { margin: -4px 0 0; color: #566158; font-size: 10px; line-height: 1.4; }
    button { border: 0; border-radius: 22px; background: #087c68; color: white; padding: 12px 16px; font: inherit; font-weight: 700; cursor: pointer; }
    button:disabled { opacity: .65; cursor: wait; }
    .bubble { margin: 8px 0; max-width: 90%; border-radius: 14px; padding: 11px 13px; line-height: 1.4; font-size: 13px; }
    .bubble.incoming { margin-right: auto; background: white; }
    .bubble.outgoing { margin-left: auto; background: #d7f8c6; }
    #status { min-height: 20px; color: #45554a; font-size: 13px; }
    #results { display: grid; gap: 10px; }
    .result { background: white; line-height: 1.45; font-size: 13px; box-shadow: 0 1px 2px #17231d12; }
    .result h2 { margin: 0 0 5px; font-size: 15px; }
    .result p { margin: 4px 0; }
    .result a { color: #087c68; font-weight: 700; }
    .disclaimer { margin: 15px 2px; color: #566158; font-size: 11px; line-height: 1.45; }
  </style>
</head>
<body>
  <section class="phone" aria-label="MediCompare WhatsApp simulator">
    <header>
      <h1>MediCompare WA</h1>
      <p>Medicine price comparison simulator</p>
    </header>
    <main>
      <div class="intro">Search pharmacy inventory by medicine name, then share a sample Nairobi location to compare nearby prices.</div>
      <form id="search-form">
        <label for="medicine-search">Medicine name
          <input id="medicine-search" name="medicine" type="search" list="medicine-options" maxlength="160" placeholder="Type a name or choose from the list" required disabled autocomplete="off">
          <datalist id="medicine-options"></datalist>
        </label>
        <div id="category-pills" class="category-pills" role="group" aria-label="Filter medicines by category"></div>
        <label for="medicine-list">Browse stocked medicines
          <select id="medicine-list" class="medicine-list" size="5" aria-label="Stocked medicines" disabled>
            <option value="">Loading medicines...</option>
          </select>
        </label>
        <p class="picker-note">Type part of a medicine name or select one from the scrollable list.</p>
        <div class="coords">
          <label for="constituency">Constituency
            <select id="constituency" name="constituency" size="5" required disabled>
              <option value="">Loading constituencies...</option>
            </select>
          </label>
          <label for="area">Area / Location
            <select id="area" name="area" size="5" required disabled>
              <option value="">Choose a constituency first</option>
            </select>
          </label>
        </div>
        <p class="location-note">Representative area coordinates, not live GPS. Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>.</p>
        <button id="submit" type="submit">Share Nairobi location &amp; compare</button>
      </form>
        <section id="chat-log" aria-label="Conversation" aria-live="polite">
          <div class="bubble incoming">Choose a medicine and Nairobi area to compare nearby prices.</div>
        </section>
      <div id="status" role="status" aria-live="polite"></div>
      <section id="results" aria-label="Nearby pharmacy results"></section>
        <button id="search-again" type="button" hidden>Search Another Medicine</button>
      <p class="disclaimer">Sample inventory and prices are for demonstration and may not reflect live chemist stock. This is not medical advice; verify medicine details with a licensed pharmacist or doctor.</p>
    </main>
  </section>
  <script>
    const form = document.querySelector("#search-form");
    const status = document.querySelector("#status");
    const results = document.querySelector("#results");
    const submit = document.querySelector("#submit");
    const searchAgain = document.querySelector("#search-again");
    const chatLog = document.querySelector("#chat-log");
    const medicineSearch = document.querySelector("#medicine-search");
    const medicineOptions = document.querySelector("#medicine-options");
    const medicineList = document.querySelector("#medicine-list");
    const categoryPills = document.querySelector("#category-pills");
    const constituencySelect = document.querySelector("#constituency");
    const areaSelect = document.querySelector("#area");
    let constituencies = [];
    let medicineCatalog = [];
    let activeCategory = "All";
    const addText = (parent, tag, text) => {
      const element = document.createElement(tag);
      element.textContent = text;
      parent.append(element);
      return element;
    };
    const addBubble = (text, outgoing) => {
      const bubble = addText(chatLog, "div", text);
      bubble.className = "bubble " + (outgoing ? "outgoing" : "incoming");
    };
    const formatHours = (hours) => {
      if (typeof hours === "string") return hours;
      if (hours && typeof hours === "object") {
        return Object.entries(hours).map(([day, value]) => day + ": " + value).join(" · ");
      }
      return "Hours not provided";
    };

    function medicineValue(medicine) {
      return [
        medicine.genericName,
        medicine.brandName,
        medicine.strength,
        medicine.dosageForm,
        medicine.packSize
      ].filter(Boolean).join(" ");
    }

    function medicineLabel(medicine) {
      return medicine.genericName
        + (medicine.brandName ? " (" + medicine.brandName + ")" : "")
        + " · " + medicine.strength
        + " · " + medicine.dosageForm
        + " · " + medicine.packSize;
    }

    function renderMedicinePicker() {
      const filter = medicineSearch.value.trim().toLowerCase();
      const filtered = medicineCatalog.filter((medicine) => {
        const categoryMatches = activeCategory === "All" || medicine.category === activeCategory;
        const searchable = (medicineLabel(medicine) + " " + medicineValue(medicine)).toLowerCase();
        const queryMatches = !filter || searchable.includes(filter);
        return categoryMatches && queryMatches;
      });

      medicineOptions.replaceChildren();
      medicineList.replaceChildren();
      if (!filtered.length) {
        const option = document.createElement("option");
        option.value = "";
        option.label = "No matching medicines";
        option.textContent = "No matching medicines";
        medicineOptions.append(option.cloneNode(true));
        medicineList.append(option);
        return;
      }

      filtered.forEach((medicine) => {
        const value = medicineValue(medicine);
        const label = medicineLabel(medicine) + " · " + medicine.category;
        const suggestion = document.createElement("option");
        suggestion.value = value;
        suggestion.label = label;
        medicineOptions.append(suggestion);

        const choice = document.createElement("option");
        choice.value = value;
        choice.textContent = label;
        medicineList.append(choice);
      });
    }

    function renderCategoryPills() {
      categoryPills.replaceChildren();
      const categories = ["All", ...new Set(medicineCatalog.map((medicine) => medicine.category))];
      categories.forEach((category) => {
        const pill = document.createElement("button");
        pill.type = "button";
        pill.className = "category-pill";
        pill.textContent = category;
        pill.setAttribute("aria-pressed", String(category === activeCategory));
        pill.addEventListener("click", () => {
          activeCategory = category;
          medicineSearch.value = "";
          renderCategoryPills();
          renderMedicinePicker();
        });
        categoryPills.append(pill);
      });
    }

    async function loadMedicines() {
      try {
        const response = await fetch("/api/medicines");
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load medicines.");

        medicineCatalog = data.medicines;
        if (medicineCatalog.length) {
          medicineSearch.disabled = false;
          medicineList.disabled = false;
          renderCategoryPills();
          renderMedicinePicker();
        } else {
          const option = document.createElement("option");
          option.value = "";
          option.textContent = "No medicines available";
          medicineList.replaceChildren(option);
          status.textContent = "No medicines are available yet.";
        }
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : "Could not load medicines.";
      }
    }

    function updateAreas() {
      const constituency = constituencies.find((item) => item.name === constituencySelect.value);
      areaSelect.replaceChildren();
      if (!constituency) {
        areaSelect.disabled = true;
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "Choose a constituency first";
        areaSelect.append(option);
        return;
      }

      constituency.areas.forEach((area) => {
        const option = document.createElement("option");
        option.value = area.name;
        option.textContent = area.name;
        option.dataset.lat = String(area.lat);
        option.dataset.lng = String(area.lng);
        areaSelect.append(option);
      });
      areaSelect.disabled = constituency.areas.length === 0;
    }

    async function loadLocations() {
      try {
        const response = await fetch("/api/locations");
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load Nairobi locations.");

        constituencies = data.constituencies;
        constituencySelect.replaceChildren();
        constituencies.forEach((constituency) => {
          const option = document.createElement("option");
          option.value = constituency.name;
          option.textContent = constituency.name;
          constituencySelect.append(option);
        });
        if (constituencies.length) {
          constituencySelect.disabled = false;
          constituencySelect.value = constituencies[0].name;
          updateAreas();
        }
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : "Could not load Nairobi locations.";
      }
    }

    loadMedicines();
    loadLocations();
    medicineSearch.addEventListener("input", renderMedicinePicker);
    medicineList.addEventListener("change", () => {
      if (medicineList.value) {
        medicineSearch.value = medicineList.value;
        renderMedicinePicker();
      }
    });
    constituencySelect.addEventListener("change", updateAreas);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      results.replaceChildren();
      status.textContent = "Checking nearby pharmacy prices…";
      submit.disabled = true;
      const query = medicineSearch.value.trim();
      const selectedArea = areaSelect.selectedOptions[0];
      const constituency = constituencySelect.value;
      const areaName = selectedArea.value;
      const lat = Number(selectedArea.dataset.lat);
      const lng = Number(selectedArea.dataset.lng);
      addBubble(query + " near " + areaName + ", " + constituency, true);

      try {
        const response = await fetch("/api/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, lat, lng, constituency, areaName })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Search failed.");

        if (!data.results.length) {
          status.textContent = "No matching in-stock pharmacies were found nearby.";
          addBubble("No matching in-stock pharmacies were found nearby.", false);
        } else {
          status.textContent = data.results.length + " nearby result(s) around " + data.areaName + ", " + data.constituency + " — ordered by price.";
          addBubble("Here are nearby in-stock prices, ordered from lowest to highest.", false);
          data.results.forEach((result, index) => {
            const card = document.createElement("article");
            card.className = "result";
            addText(card, "h2", (index + 1) + ". " + result.pharmacyName);
            addText(card, "p", result.medicineName
              + (result.brandName ? " (" + result.brandName + ")" : "")
              + " · " + result.strength
              + " · " + result.dosageForm
              + " · " + result.packSize
              + " — " + result.currency + " " + Number(result.price).toFixed(2));
            addText(card, "p", Number(result.distanceKm).toFixed(1) + " km · " + formatHours(result.openingHours));
            const map = addText(card, "a", "Open map");
            map.href = result.googleMapsUrl;
            map.target = "_blank";
            map.rel = "noopener noreferrer";
            results.append(card);
          });
        }
        searchAgain.hidden = false;
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : "Search failed.";
      } finally {
        submit.disabled = false;
      }
    });

    searchAgain.addEventListener("click", () => {
      results.replaceChildren();
      status.textContent = "";
      searchAgain.hidden = true;
      medicineSearch.value = "";
      renderMedicinePicker();
      addBubble("Which medicine would you like to compare?", false);
      medicineSearch.focus();
    });
  </script>
</body>
</html>`;

export function createSimulatorRouter(
  overrides: Partial<SimulatorDependencies> = {},
): Router {
  const dependencies: SimulatorDependencies = {
    searchPharmacies: (input) => searchNearbyPharmacies(input, getPrismaClient()),
    listMedicines: () => getPrismaClient().medicine.findMany({
      where: {
        inventory: {
          some: { quantityOnHand: { gt: 0 } },
        },
      },
      select: {
        id: true,
        genericName: true,
        brandName: true,
        strength: true,
        dosageForm: true,
        packSize: true,
        category: true,
      },
      orderBy: [
        { category: "asc" },
        { genericName: "asc" },
        { strength: "asc" },
        { dosageForm: "asc" },
      ],
    }),
    ...overrides,
  };
  const router = Router();

  router.get("/simulator", (_req: Request, res: Response) => {
    res.type("html").send(simulatorPage);
  });

  router.get("/api/medicines", async (_req: Request, res: Response) => {
    try {
      const medicines = await dependencies.listMedicines();
      res.json({ medicines });
    } catch (error) {
      console.error("Simulator medicine list failed:", error);
      res.status(500).json({ error: "Unable to load medicines right now." });
    }
  });

  router.get("/api/locations", (_req: Request, res: Response) => {
    res.json({ constituencies: nairobiConstituencies });
  });

  router.post(
    "/api/simulate",
    async (req: Request<unknown, unknown, SimulationRequest>, res: Response) => {
      const { query, lat, lng, constituency, areaName, radiusKm } = req.body ?? {};
      if (typeof query !== "string" || !query.trim() || query.length > 160) {
        res.status(400).json({ error: "Enter a medicine name up to 160 characters." });
        return;
      }
      if (typeof constituency !== "string" || typeof areaName !== "string") {
        res.status(400).json({ error: "Select a Nairobi constituency and area." });
        return;
      }
      const selectedConstituency = nairobiConstituencies.find(
        (item) => item.name === constituency,
      );
      const selectedArea = selectedConstituency?.areas.find(
        (area) => area.name === areaName,
      );
      if (!selectedArea) {
        res.status(400).json({ error: "Select a valid area for the chosen constituency." });
        return;
      }
      if (
        typeof lat !== "number"
        || !Number.isFinite(lat)
        || lat < -90
        || lat > 90
        || typeof lng !== "number"
        || !Number.isFinite(lng)
        || lng < -180
        || lng > 180
      ) {
        res.status(400).json({ error: "Provide valid latitude and longitude coordinates." });
        return;
      }
      if (lat !== selectedArea.lat || lng !== selectedArea.lng) {
        res.status(400).json({ error: "Coordinates must match the selected area." });
        return;
      }
      if (
        radiusKm !== undefined
        && (typeof radiusKm !== "number" || !Number.isFinite(radiusKm) || radiusKm <= 0)
      ) {
        res.status(400).json({ error: "Search radius must be a positive number of kilometers." });
        return;
      }

      try {
        const results = await dependencies.searchPharmacies({
          query: query.trim(),
          lat,
          lng,
          ...(typeof radiusKm === "number" ? { radiusKm } : {}),
        });
        res.json({ constituency, areaName, results });
      } catch (error) {
        console.error("Simulator pharmacy search failed:", error);
        res.status(500).json({ error: "Unable to search pharmacy prices right now." });
      }
    },
  );

  return router;
}

export default createSimulatorRouter();
