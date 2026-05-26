# Astro_freelance

# বৈদিক / বাংলা জ্যোতিষ শাস্ত্র — সম্পূর্ণ গাণিতিক ও ঐতিহ্যগত ডকুমেন্টেশন
## Complete Traditional Mathematical Documentation of Vedic / Bengali Astrology
### Manual Calculation Methods — No Software, No APIs, First Principles Only

---

> **উদ্দেশ্য (Purpose):** এই ডকুমেন্টেশন সম্পূর্ণরূপে ঐতিহ্যগত জ্যোতিষ গণনার গাণিতিক পদ্ধতি ব্যাখ্যা করে — কোনো সফটওয়্যার, লাইব্রেরি বা API ছাড়াই।  
> This documentation explains exclusively the mathematical methods of traditional astrology — without any software, library, or API.

---

# PART I — THE FOUNDATION

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 1. রাশি চক্র (Rashi Chakra) — The Zodiac

---

### 1.1 What Is the Zodiac Mathematically?

The **zodiac** (রাশি চক্র) is an imaginary belt of sky extending approximately 8° on either side of the **ecliptic** — the apparent annual path of the Sun as seen from Earth.

Mathematically, the zodiac is modeled as a **great circle** of **360 degrees**.

```
Full Circle = 360°
This circle is divided into 12 equal arcs → each arc = 30°
Each arc = one Rashi (sign)
```

**Why 360?**  
- Ancient astronomers noted the Sun completes one full journey through the sky in approximately **365.25 days**.
- 360 was chosen because it is **highly composite** — divisible by 2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36, 40, 45, 60, 72, 90, 120, 180.
- It also closely approximates the actual year (360 ≈ 365).
- In ancient Babylonian/Vedic tradition, 360° = one cosmic year.

**Why 12 Signs?**  
- The Moon completes approximately **12 full orbits** of Earth in one solar year.
- 12 is divisible by 2, 3, 4, 6 — enabling natural groupings (triplicities, quadruplicities, etc.)
- 360° ÷ 12 = **30° per sign** — a mathematically elegant division.

---

### 1.2 Sidereal vs. Tropical Zodiac

This is the **most critical difference** between Western and Vedic astrology.

| Feature | Tropical Zodiac | Sidereal Zodiac (Nirayana) |
|---|---|---|
| **Starting Point** | Vernal Equinox (0° Aries = March equinox) | Fixed star background (Spica/Chitra as reference) |
| **Moves?** | Yes — follows the equinox point | No — fixed to star positions |
| **Precession** | Incorporated (equinox precesses ~50.3"/year) | Corrected by Ayanamsa |
| **Used By** | Western astrology | Vedic / Bengali astrology |
| **Basis** | Seasonal (Earth–Sun relationship) | Stellar (fixed star background) |

#### The Precession of Equinoxes

Earth's axis wobbles like a spinning top, completing one full wobble in approximately **25,920 years** (the Great Year or Platonic Year).

- Rate of precession: ≈ **50.3 arc-seconds per year**
- This means the vernal equinox point **drifts backward** through the zodiac.
- Roughly every 72 years, it moves 1°.

As of 2000 CE, the two zodiacs differ by approximately **23°51'** (this difference is the **Ayanamsa**).

---

### 1.3 Ayanamsa — The Correction Factor

**Ayanamsa** (অয়নাংশ) is the angular difference between the tropical and sidereal zodiacs at a given point in time.

```
Sidereal Longitude = Tropical Longitude − Ayanamsa
```

**Lahiri Ayanamsa** (the official Indian government standard, used by most Bengali astrologers):

| Year | Lahiri Ayanamsa |
|------|-----------------|
| 1900 | 22° 27' 37.76" |
| 1950 | 23° 09' 29.68" |
| 2000 | 23° 51' 10.98" |
| 2024 | 24° 07' ~      |

**Linear approximation formula:**
```
Ayanamsa(Y) ≈ 22°27'37.76" + [(Y − 1900) × 50.3"]
```

Convert arc-seconds to degrees:
```
50.3" per year × (Y − 1900) years = total arc-seconds
÷ 3600 = total degrees of additional ayanamsa
```

**Example:** For year 1990:
```
Additional = (1990 − 1900) × 50.3" = 90 × 50.3 = 4527"
4527" ÷ 3600 = 1.258° = 1°15'28"
Ayanamsa(1990) ≈ 22°27'37" + 1°15'28" = 23°43'05"
```

---

### 1.4 The 12 Rashis — Complete Table

```
Formula: Sign Number = floor(λ / 30°) + 1
Where λ = sidereal longitude of the planet (0° to 360°)
```

| # | Rashi (Bengali) | Rashi (Sanskrit) | English | Symbol | Range (λ) | Element | Quality |
|---|---|---|---|---|---|---|---|
| 1 | মেষ | Meṣa | Aries | ♈ | 0°–30° | Fire | Cardinal |
| 2 | বৃষ | Vṛṣabha | Taurus | ♉ | 30°–60° | Earth | Fixed |
| 3 | মিথুন | Mithuna | Gemini | ♊ | 60°–90° | Air | Mutable |
| 4 | কর্কট | Karkaṭa | Cancer | ♋ | 90°–120° | Water | Cardinal |
| 5 | সিংহ | Siṃha | Leo | ♌ | 120°–150° | Fire | Fixed |
| 6 | কন্যা | Kanyā | Virgo | ♍ | 150°–180° | Earth | Mutable |
| 7 | তুলা | Tulā | Libra | ♎ | 180°–210° | Air | Cardinal |
| 8 | বৃশ্চিক | Vṛścika | Scorpio | ♏ | 210°–240° | Water | Fixed |
| 9 | ধনু | Dhanu | Sagittarius | ♐ | 240°–270° | Fire | Mutable |
| 10 | মকর | Makara | Capricorn | ♑ | 270°–300° | Earth | Cardinal |
| 11 | কুম্ভ | Kumbha | Aquarius | ♒ | 300°–330° | Air | Fixed |
| 12 | মীন | Mīna | Pisces | ♓ | 330°–360° | Water | Mutable |

---

### 1.5 How to Determine Sign from Longitude — Step by Step

**Given:** Sidereal longitude λ (already corrected for Ayanamsa)

**Step 1:** Ensure 0° ≤ λ < 360°  
If λ < 0: λ = λ + 360°  
If λ ≥ 360°: λ = λ − 360° (repeat)

**Step 2:** Calculate sign index:
```
Sign Index = floor(λ / 30)        [result is 0 to 11]
Sign Number = Sign Index + 1       [result is 1 to 12]
```

**Step 3:** Calculate degree within sign:
```
Degree within sign = λ − (Sign Index × 30)
```

**Example:** λ = 157.5° (sidereal)
```
Sign Index = floor(157.5 / 30) = floor(5.25) = 5
Sign Number = 5 + 1 = 6 → Kanya (Virgo)
Degree within sign = 157.5 − (5 × 30) = 157.5 − 150 = 7.5°
= 7° 30' in Kanya
```

**Example:** λ = 312.75°
```
Sign Index = floor(312.75 / 30) = floor(10.425) = 10
Sign Number = 10 + 1 = 11 → Kumbha (Aquarius)
Degree = 312.75 − 300 = 12.75° = 12° 45' in Kumbha
```

---

### 1.6 Degree-Minute-Second Conversion

**Decimal degrees → DMS:**
```
Integer part = degrees
Remaining decimal × 60 = minutes (take integer part)
Remaining decimal of minutes × 60 = seconds
```

**Example:** 7.5° → 7° 30' 00"  
**Example:** 12.758° → 12° 45' 28.8" → 12° 45' 29" (rounded)

**DMS → Decimal degrees:**
```
Decimal = D + (M/60) + (S/3600)
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 2. গ্রহ অবস্থান (Planetary Position) — Planetary Longitude Theory

---

### 2.1 The Celestial Sphere

Ancient and traditional astrologers modeled the sky as a **celestial sphere** — an imaginary sphere of infinite radius surrounding Earth at its center.

All celestial objects are projected onto this sphere and their positions measured by:

- **Ecliptic Longitude (λ):** Measured along the ecliptic (Sun's path), from 0° (vernal equinox for tropical, fixed point for sidereal), eastward 0°–360°.
- **Ecliptic Latitude (β):** Measured north (+) or south (−) of the ecliptic, −90° to +90°.

For astrological purposes, **only ecliptic longitude** is used — planets are **projected onto the ecliptic** regardless of their latitude.

---

### 2.2 Apparent Planetary Motion

Planets appear to move against the background stars (from west to east, generally) due to their own orbital motion. This apparent motion is called **direct motion** (সরল গতি).

**Retrograde Motion (বক্রগতি):**  
When a faster planet (Earth) overtakes a slower outer planet, the outer planet appears to move backward (east to west) for a period. This is **retrograde motion** (ℛ).

Traditional notation: If a planet is retrograde, its symbol has an ℛ appended.

Retrograde periods (approximate):
| Planet | Frequency | Duration |
|--------|-----------|----------|
| Mercury | ~3× per year | 21–24 days |
| Venus | ~every 18 months | 40–43 days |
| Mars | ~every 2 years | 60–80 days |
| Jupiter | ~10–11 months apart | ~120 days |
| Saturn | ~12 months apart | ~138 days |

**Retrograde has NO mathematical effect on longitude calculation** — the planet's actual ecliptic longitude at the moment of birth is what is recorded, whether it is in direct or retrograde motion.

---

### 2.3 The Traditional 9 Planets (Navagraha)

Vedic astrology uses **9 "planets"** (গ্রহ — literally "seizers"):

| # | Name (Bengali) | Name (Sanskrit) | Body | Symbol |
|---|---|---|---|---|
| 1 | রবি / সূর্য | Ravi / Sūrya | Sun | ☉ |
| 2 | চন্দ্র | Candra | Moon | ☽ |
| 3 | মঙ্গল | Maṅgala | Mars | ♂ |
| 4 | বুধ | Budha | Mercury | ☿ |
| 5 | বৃহস্পতি / গুরু | Bṛhaspati / Guru | Jupiter | ♃ |
| 6 | শুক্র | Śukra | Venus | ♀ |
| 7 | শনি | Śani | Saturn | ♄ |
| 8 | রাহু | Rāhu | Moon's North Node | ☊ |
| 9 | কেতু | Ketu | Moon's South Node | ☋ |

---

### 2.4 Rahu and Ketu — Mathematical Theory

**Rahu** (রাহু) and **Ketu** (কেতু) are the **lunar nodes** — the two points where the Moon's orbital plane intersects the ecliptic.

**Why always opposite?**
The Moon's orbital plane intersects the ecliptic at exactly **two points** — these two points are always exactly **180° apart** by geometric necessity (they are diametrically opposite points on a great circle).

```
Ketu = Rahu + 180°     (if Rahu longitude is known)
OR
Ketu = Rahu − 180°     (same result, modulo 360°)
```

**Formula:**
```
If Rahu = R°, then Ketu = (R + 180°) mod 360°
```

**Direction of motion:** The nodes move **retrograde** (westward) through the zodiac, completing one cycle in approximately **18.6 years** (6793.5 days).

**Rate:** ≈ 19.35° per year ≈ 3 minutes of arc per day (retrograde)

**Traditional significance:**  
- Rahu: the ascending node (where Moon crosses ecliptic going north) — associated with obsession, ambition, worldly desire
- Ketu: the descending node (where Moon crosses ecliptic going south) — associated with liberation, spirituality, past-life karma

---

### 2.5 Longitude Normalization Formula

All planetary longitudes must be kept in the range **[0°, 360°)**:

```
λ_normalized = λ mod 360

If λ < 0:   λ_normalized = λ + 360° (repeat until ≥ 0)
If λ ≥ 360: λ_normalized = λ − 360° (repeat until < 360)
```

**General formula:**
```
λ_normalized = ((λ % 360) + 360) % 360
```

This always produces a value in [0°, 360°).

---

### 2.6 Traditional Longitude Calculation from Ephemeris Tables

Before modern computation, astrologers used **Panchang (পঞ্জিকা)** — pre-calculated almanac tables.

**Process:**
1. Find the planet's tropical longitude from the ephemeris for the given date.
2. Subtract the Ayanamsa for that year.
3. Normalize to [0°, 360°).
4. Determine sign, degree, minute.

**DMS Subtraction:**
```
To subtract: A°B'C" − D°E'F"

If C < F: borrow 1 minute → C = C + 60, B = B − 1
If B < E: borrow 1 degree → B = B + 60, A = A − 1
Then: (A−D)°(B−E)'(C−F)"
```

**Example:** Planet at tropical 185°23'45", Ayanamsa = 23°51'11":
```
185°23'45"
−  23°51'11"
-----------
Step 1: 45" − 11" = 34" ✓
Step 2: 23' − 51' → can't, borrow: 83' − 51' = 32', degrees become 184°
Step 3: 184° − 23° = 161°
Result: 161°32'34"
Sign: floor(161.543/30) = floor(5.385) = 5 → Sign 6 = Kanya
Degree in sign: 161.543 − 150 = 11.543° = 11°32'34"
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 3. রাশি / লগ্ন / নক্ষত্র — Rashi, Lagna, Nakshatra

---

### 3A. RASHI (রাশি) — Moon Sign

#### Why the Moon Determines Rashi in Bengali/Vedic Astrology

In Vedic astrology, the **Moon sign (Chandra Rashi / চন্দ্র রাশি)** is the primary sign — more important than the Sun sign (used in Western astrology).

**Reason:** The Moon represents **mind (মন), emotions, mother, and the inner self** in Vedic philosophy. The Moon moves much faster than the Sun (changes sign every ~2.5 days), making it more individualized.

**Moon Sign Calculation:**
```
1. Find Moon's tropical longitude from ephemeris
2. Subtract Ayanamsa → Sidereal Moon longitude (λ_moon)
3. Normalize to [0°, 360°)
4. Rashi = floor(λ_moon / 30°) + 1
```

**Example:** Moon tropical longitude = 210°15'30"  
Ayanamsa (2000) = 23°51'11"  
```
Sidereal λ_moon = 210°15'30" − 23°51'11" = 186°24'19"
Rashi = floor(186.405 / 30) + 1 = floor(6.213) + 1 = 6 + 1 = 7
Sign 7 = Tula (Libra / তুলা)
Degree in Tula = 186°24'19" − 180° = 6°24'19"
```

---

### 3B. LAGNA (লগ্ন) — Ascendant / Rising Sign

#### Theory

The **Lagna** (ascendant) is the **zodiac sign rising on the eastern horizon** at the exact moment of birth, at the specific geographic location.

**Why it changes quickly:**  
Earth rotates 360° in 24 hours = **1° every 4 minutes**. Therefore the entire zodiac crosses the eastern horizon in 24 hours. Each sign (30°) takes approximately **2 hours** to rise, but the rate varies with geographic latitude.

#### The Astronomical Concept

The horizon divides the celestial sphere into two halves. The **East Point** (eastern horizon) continually changes as Earth rotates. The zodiac sign at the East Point is the Lagna.

#### Key Parameters for Lagna Calculation

1. **Date and Time of Birth** (in UT/GMT)
2. **Geographic Latitude (φ)** of birthplace
3. **Geographic Longitude (L)** of birthplace

#### Step 1: Calculate Julian Day Number (JD)

For any date Y/M/D (Gregorian calendar):
```
If M ≤ 2: Y = Y − 1, M = M + 12
A = floor(Y / 100)
B = 2 − A + floor(A / 4)
JD = floor(365.25 × (Y + 4716)) + floor(30.6001 × (M + 1)) + D + B − 1524.5
```

**Example:** Date = 1985 August 15
```
M = 8 (> 2, no adjustment)
A = floor(1985/100) = 19
B = 2 − 19 + floor(19/4) = 2 − 19 + 4 = −13
JD = floor(365.25 × 5701) + floor(30.6001 × 9) + 15 + (−13) − 1524.5
   = floor(2083907.25) + floor(275.4009) + 15 − 13 − 1524.5
   = 2083907 + 275 + 15 − 13 − 1524.5
   = 2446657.5
```

#### Step 2: Calculate Greenwich Mean Sidereal Time (GMST)

```
T = (JD − 2451545.0) / 36525      (Julian centuries from J2000.0)

GMST (in degrees) = 280.46061837 
                  + 360.98564736629 × (JD − 2451545.0)
                  + 0.000387933 × T²
                  − T³ / 38710000
```

Then normalize GMST to [0°, 360°).

#### Step 3: Calculate Local Sidereal Time (LST)

```
LST = GMST + Geographic_Longitude_East
```

(Add east longitude, subtract west longitude)

Normalize to [0°, 360°).

**What is LST?** LST is the Right Ascension (RA) of the meridian — the degree of sky currently on the prime meridian. The LST also equals the sidereal time.

#### Step 4: Obliquity of the Ecliptic (ε)

```
ε = 23° 26' 21.448" − 46.8150" × T − 0.00059" × T² + 0.001813" × T³
```

For practical calculations, ε ≈ 23°27' is often used (varies slowly).

#### Step 5: Calculate the Ascendant (RAMC Method)

The **RAMC** (Right Ascension of the Midheaven Culminating) = LST (in degrees).

The Ascendant (tropical) is calculated from:
```
tan(Ascendant) = −cos(RAMC) / [sin(RAMC) × cos(ε) + tan(φ) × sin(ε)]
```

Where:
- RAMC = Local Sidereal Time in degrees
- ε = Obliquity of ecliptic
- φ = Geographic latitude of birthplace

**Resolve the quadrant ambiguity:**  
The formula gives two possible solutions. Use the RAMC value to determine which quadrant.

#### Step 6: Apply Ayanamsa

```
Sidereal Lagna = Tropical Ascendant − Ayanamsa
```

Normalize to [0°, 360°), then determine sign.

---

#### Traditional Astrologer's Shortcut (Panchang Method)

In practice, most traditional Bengali/Vedic astrologers use:
1. The **Panchang (পঞ্জিকা)** — printed almanac that lists Sidereal Time for local meridian (usually Kolkata/Varanasi) for each day.
2. **Lagna tables** — pre-computed tables showing which Lagna rises at each LST for given latitude.

**Steps:**
1. Find the Panchang's Sidereal Time for the birth date and time.
2. Add correction for birth longitude vs. reference meridian.
3. Look up the Lagna table for the resulting LST at birth latitude.
4. Read off the Lagna directly.

---

### 3C. NAKSHATRA (নক্ষত্র)

#### Why 27 Nakshatras?

The Moon takes approximately **27.32 days** to orbit Earth (sidereal month). Ancient astronomers observed that the Moon occupies a different area of the star background each night — approximately 27 distinct stellar regions over one lunar orbit.

Thus the sky was divided into **27 equal sectors**:
```
360° / 27 = 13°20' per Nakshatra (exactly 800 arc-minutes)
```

Some systems use **28 nakshatras** (adding Abhijit), but the standard system for Dasha calculation uses 27.

#### Nakshatra Indexing Formula

```
Nakshatra Number = floor(λ_moon / (360/27)) + 1
                 = floor(λ_moon / 13.3333...) + 1
                 = floor(λ_moon × 27 / 360) + 1
```

Degree within Nakshatra:
```
Degree_in_Nak = λ_moon − (Nakshatra_Index × 360/27)
Where Nakshatra_Index = Nakshatra Number − 1
```

---

#### Complete Nakshatra Table

| # | Nakshatra (Bengali) | Nakshatra (Sanskrit) | Range | Lord (Dasha) | Deity |
|---|---|---|---|---|---|
| 1 | অশ্বিনী | Aśvinī | 0°–13°20' Aries | Ketu | Ashvins |
| 2 | ভরণী | Bharaṇī | 13°20'–26°40' Aries | Venus | Yama |
| 3 | কৃত্তিকা | Kṛttikā | 26°40'–40°00' (=10° Taurus) | Sun | Agni |
| 4 | রোহিণী | Rohiṇī | 40°–53°20' Taurus | Moon | Brahma |
| 5 | মৃগশিরা | Mṛgaśirā | 53°20'–66°40' Taurus/Gemini | Mars | Soma |
| 6 | আর্দ্রা | Ārdrā | 66°40'–80°00' Gemini | Rahu | Rudra |
| 7 | পুনর্বসু | Punarvasu | 80°–93°20' Gemini/Cancer | Jupiter | Aditi |
| 8 | পুষ্যা | Puṣyā | 93°20'–106°40' Cancer | Saturn | Brhaspati |
| 9 | আশ্লেষা | Āśleṣā | 106°40'–120°00' Cancer | Mercury | Sarpa |
| 10 | মঘা | Maghā | 120°–133°20' Leo | Ketu | Pitrs |
| 11 | পূর্বফল্গুনী | Pūrva Phālgunī | 133°20'–146°40' Leo | Venus | Bhaga |
| 12 | উত্তরফল্গুনী | Uttara Phālgunī | 146°40'–160°00' Leo/Virgo | Sun | Aryaman |
| 13 | হস্তা | Hasta | 160°–173°20' Virgo | Moon | Savitar |
| 14 | চিত্রা | Citrā | 173°20'–186°40' Virgo/Libra | Mars | Tvashtr |
| 15 | স্বাতী | Svāti | 186°40'–200°00' Libra | Rahu | Vayu |
| 16 | বিশাখা | Viśākhā | 200°–213°20' Libra/Scorpio | Jupiter | Indragni |
| 17 | অনুরাধা | Anurādhā | 213°20'–226°40' Scorpio | Saturn | Mitra |
| 18 | জ্যেষ্ঠা | Jyeṣṭhā | 226°40'–240°00' Scorpio | Mercury | Indra |
| 19 | মূলা | Mūla | 240°–253°20' Sagittarius | Ketu | Nirrti |
| 20 | পূর্বষাঢ়া | Pūrvāṣāḍhā | 253°20'–266°40' Sagittarius | Venus | Apas |
| 21 | উত্তরষাঢ়া | Uttarāṣāḍhā | 266°40'–280°00' Sagittarius/Cap | Sun | Vishvadevas |
| 22 | শ্রবণ | Śravaṇa | 280°–293°20' Capricorn | Moon | Vishnu |
| 23 | ধনিষ্ঠা | Dhaniṣṭhā | 293°20'–306°40' Cap/Aquarius | Mars | Vasus |
| 24 | শতভিষা | Śatabhiṣā | 306°40'–320°00' Aquarius | Rahu | Varuna |
| 25 | পূর্বভাদ্রপদ | Pūrva Bhādrapadā | 320°–333°20' Aquarius/Pisces | Jupiter | Ajaikapad |
| 26 | উত্তরভাদ্রপদ | Uttara Bhādrapadā | 333°20'–346°40' Pisces | Saturn | Ahirbudhnya |
| 27 | রেবতী | Revatī | 346°40'–360°00' Pisces | Mercury | Pushan |

---

#### Example: Finding Nakshatra

**Given:** Moon sidereal longitude = 186°24'19"

```
λ = 186.4053°

Nakshatra Number = floor(186.4053 × 27 / 360) + 1
                 = floor(186.4053 / 13.3333) + 1
                 = floor(13.98) + 1
                 = 13 + 1
                 = 14 → Chitra (চিত্রা)

Start of Chitra = 13 × 13.3333° = 173.333° = 173°20'
Degree in Nakshatra = 186°24'19" − 173°20'00" = 13°04'19"
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 4. নক্ষত্র পাদ (Nakshatra Pada)

---

### 4.1 Theory — Why 4 Padas?

Each Nakshatra (13°20') is divided into **4 equal parts** called **Padas** (পাদ, literally "feet" or "quarters").

```
Pada width = 13°20' / 4 = 3°20' per Pada (= 200 arc-minutes)
```

**Spiritual Reasoning:**  
The 4 padas correspond to the 4 aims of life (**Purusharthas**):
1. Dharma (righteousness)
2. Artha (wealth)
3. Kama (desire)
4. Moksha (liberation)

**Navamsa Connection:**  
27 Nakshatras × 4 Padas = **108 total Padas**  
360° / 108 = **3°20' per Pada**  
108 Padas = 12 signs × 9 navamsas = **Navamsa chart** (D-9)

Each Pada corresponds to one Navamsa sign. The Navamsa sign of Pada 1 of Nakshatra 1 (Ashvini) is Aries; the cycle continues through all 12 signs, wrapping around 9 times to cover all 108 Padas.

**Navamsa Sign for any Pada:**
```
Pada_Global_Number = (Nakshatra_Index × 4) + Pada_Number  [1-indexed]
Navamsa_Sign = ((Pada_Global_Number − 1) mod 12) + 1
```

---

### 4.2 Pada Calculation Formula

**Given:** Sidereal Moon longitude λ

```
Step 1: Nakshatra_Index (0-based) = floor(λ / 13.3333°)

Step 2: Position_in_Nakshatra = λ − (Nakshatra_Index × 13.3333°)

Step 3: Pada = floor(Position_in_Nakshatra / 3.3333°) + 1
             = floor(Position_in_Nakshatra × 4 / 13.3333°) + 1
```

**Example:** λ = 186°24'19" = 186.405°
```
Nakshatra_Index = floor(186.405 / 13.333) = floor(13.98) = 13  (= Chitra)
Position_in_Nak = 186.405 − (13 × 13.333) = 186.405 − 173.333 = 13.072°
Pada = floor(13.072 / 3.333) + 1 = floor(3.921) + 1 = 3 + 1 = 4

→ Chitra, Pada 4
```

---

### 4.3 Complete Pada Degree Ranges

For any Nakshatra N (1-indexed), the Pada ranges are:

| Pada | Start within Nakshatra | End within Nakshatra | Width |
|------|------------------------|----------------------|-------|
| 1 | 0°00' | 3°20' | 3°20' |
| 2 | 3°20' | 6°40' | 3°20' |
| 3 | 6°40' | 10°00' | 3°20' |
| 4 | 10°00' | 13°20' | 3°20' |

**Absolute degree ranges:** Add Nakshatra start degree to each.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 5. গণ / বর্ণ / শুভ বার — Gana, Varna, Lucky Weekday

---

### 5.1 Gana (গণ) — Cosmic Temperament

Each Nakshatra belongs to one of 3 Ganas:

| Gana | Sanskrit | Bengali | Meaning |
|------|----------|---------|---------|
| Deva | দেব | Deva | Divine, sattvic, gentle |
| Manushya | মানুষ্য | Manushya | Human, rajasic, ambitious |
| Rakshasa | রাক্ষস | Rakshasa | Demonic, tamasic, intense |

**Complete Gana Table:**

| Nakshatra | Gana |
|-----------|------|
| Ashvini | Deva |
| Bharani | Manushya |
| Krittika | Rakshasa |
| Rohini | Manushya |
| Mrigashira | Deva |
| Ardra | Manushya |
| Punarvasu | Deva |
| Pushya | Deva |
| Ashlesha | Rakshasa |
| Magha | Rakshasa |
| Purva Phalguni | Manushya |
| Uttara Phalguni | Manushya |
| Hasta | Deva |
| Chitra | Rakshasa |
| Swati | Deva |
| Vishakha | Rakshasa |
| Anuradha | Deva |
| Jyeshtha | Rakshasa |
| Moola | Rakshasa |
| Purvashadha | Manushya |
| Uttarashadha | Manushya |
| Shravana | Deva |
| Dhanishtha | Rakshasa |
| Shatabhisha | Rakshasa |
| Purva Bhadrapada | Manushya |
| Uttara Bhadrapada | Deva |
| Revati | Deva |

**Usage:** Gana is used in **Kundali matching (Guna Milan)** — compatibility between bride and groom. Deva-Deva = good; Deva-Manushya = acceptable; Deva-Rakshasa = problematic.

---

### 5.2 Varna (বর্ণ) — Cosmic Caste Classification

Varna is derived from the **Nakshatra lord's nature** and the Rashi element.

**Varna by Nakshatra Lord:**

| Planet | Varna | Bengali |
|--------|-------|---------|
| Sun | Kshatriya | ক্ষত্রিয় |
| Moon | Vaishya | বৈশ্য |
| Mars | Kshatriya | ক্ষত্রিয় |
| Mercury | Shudra | শূদ্র |
| Jupiter | Brahmin | ব্রাহ্মণ |
| Venus | Brahmin | ব্রাহ্মণ |
| Saturn | Shudra | শূদ্র |
| Rahu | — | — |
| Ketu | — | — |

**Varna by Nakshatra (complete):**

| Nakshatra | Lord | Varna |
|-----------|------|-------|
| Ashvini | Ketu | Mixed |
| Bharani | Venus | Brahmin |
| Krittika | Sun | Kshatriya |
| Rohini | Moon | Vaishya |
| Mrigashira | Mars | Kshatriya |
| Ardra | Rahu | Mixed |
| Punarvasu | Jupiter | Brahmin |
| Pushya | Saturn | Shudra |
| Ashlesha | Mercury | Shudra |
| Magha | Ketu | Mixed |
| Purva Phalguni | Venus | Brahmin |
| Uttara Phalguni | Sun | Kshatriya |
| Hasta | Moon | Vaishya |
| Chitra | Mars | Kshatriya |
| Swati | Rahu | Mixed |
| Vishakha | Jupiter | Brahmin |
| Anuradha | Saturn | Shudra |
| Jyeshtha | Mercury | Shudra |
| Moola | Ketu | Mixed |
| Purvashadha | Venus | Brahmin |
| Uttarashadha | Sun | Kshatriya |
| Shravana | Moon | Vaishya |
| Dhanishtha | Mars | Kshatriya |
| Shatabhisha | Rahu | Mixed |
| Purva Bhadrapada | Jupiter | Brahmin |
| Uttara Bhadrapada | Saturn | Shudra |
| Revati | Mercury | Shudra |

---

### 5.3 Shubha Vara (শুভ বার) — Lucky Weekday

**Origin:** Each weekday is ruled by a planet (this is why we have 7 days — named after the 7 visible "planets" of antiquity).

**Weekday–Planet Table:**

| Day | Bengali | Sanskrit | Ruling Planet | Planet (Bengali) |
|-----|---------|----------|---------------|------------------|
| Sunday | রবিবার | Ravivāra | Sun | রবি/সূর্য |
| Monday | সোমবার | Somavāra | Moon | চন্দ্র/সোম |
| Tuesday | মঙ্গলবার | Maṅgalavāra | Mars | মঙ্গল |
| Wednesday | বুধবার | Budhavāra | Mercury | বুধ |
| Thursday | বৃহস্পতিবার | Bṛhaspatijāra | Jupiter | বৃহস্পতি |
| Friday | শুক্রবার | Śukravāra | Venus | শুক্র |
| Saturday | শনিবার | Śanivāra | Saturn | শনি |

**Lucky Day Determination:**

Method 1 — Nakshatra Lord's Day:
```
Determine birth Nakshatra → Find Nakshatra Lord → Find that planet's weekday
```

Method 2 — Lagna Lord's Day:
```
Determine Lagna → Find Lagna Lord (sign ruler) → Find that planet's weekday
```

Method 3 — Moon Rashi Lord's Day:
```
Determine Moon Rashi → Find Rashi Lord → Find that planet's weekday
```

**Sign Rulerships:**

| Sign | Ruler | Bengali |
|------|-------|---------|
| Aries | Mars | মঙ্গল |
| Taurus | Venus | শুক্র |
| Gemini | Mercury | বুধ |
| Cancer | Moon | চন্দ্র |
| Leo | Sun | সূর্য |
| Virgo | Mercury | বুধ |
| Libra | Venus | শুক্র |
| Scorpio | Mars | মঙ্গল |
| Sagittarius | Jupiter | বৃহস্পতি |
| Capricorn | Saturn | শনি |
| Aquarius | Saturn | শনি |
| Pisces | Jupiter | বৃহস্পতি |

**Example:** Birth Nakshatra = Chitra (Mars-ruled)
- Nakshatra Lord = Mars → Lucky day = **Tuesday (মঙ্গলবার)**

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 6. শুভ রং (Shubha Ranga) — Lucky Colour

---

### 6.1 Traditional Theory

Colors are associated with planets through **vibrational/elemental correspondence** — ancient sages observed that each planet's light quality, element, and symbolic nature aligns with a specific color in the visible spectrum.

**Planet → Color Mapping (Standard):**

| Planet | Primary Color | Secondary | Bengali Color Name |
|--------|---------------|-----------|-------------------|
| Sun (সূর্য) | Orange/Copper | Gold | কমলা / তামাটে |
| Moon (চন্দ্র) | White / Cream | Silver | সাদা / রূপালী |
| Mars (মঙ্গল) | Red | Coral | লাল |
| Mercury (বুধ) | Green | Mixed | সবুজ |
| Jupiter (বৃহস্পতি) | Yellow | Gold | হলুদ |
| Venus (শুক্র) | White / Pink | Cream | সাদা / গোলাপি |
| Saturn (শনি) | Blue / Black | Dark Purple | নীল / কালো |
| Rahu | Smoky / Black | Dark Blue | ধোঁয়াটে কালো |
| Ketu | Variegated / Brown | Spotted | বিচিত্র / বাদামি |

### 6.2 Lucky Color Derivation Method

**Step 1:** Identify birth Nakshatra  
**Step 2:** Identify Nakshatra Lord (Dasha Lord)  
**Step 3:** The planet's color = primary lucky color

**Alternative Method — Lagna Lord:**
```
Lagna → Lagna Lord → Planet's color = lucky color
```

**Rashi-based colors:**

| Rashi | Element | Lucky Color |
|-------|---------|-------------|
| Aries (Mars) | Fire | Red |
| Taurus (Venus) | Earth | Pink / White |
| Gemini (Mercury) | Air | Green |
| Cancer (Moon) | Water | White / Silver |
| Leo (Sun) | Fire | Orange / Gold |
| Virgo (Mercury) | Earth | Green |
| Libra (Venus) | Air | White / Light Blue |
| Scorpio (Mars) | Water | Red / Maroon |
| Sagittarius (Jupiter) | Fire | Yellow |
| Capricorn (Saturn) | Earth | Black / Navy Blue |
| Aquarius (Saturn) | Air | Blue |
| Pisces (Jupiter) | Water | Yellow / Violet |

**Example:** Birth Nakshatra = Chitra (Mars-ruled)
- Lucky Color = **Red (লাল)**

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 7. শুভ সংখ্যা (Shubha Sankhya) — Lucky Number

---

### 7.1 Traditional Vedic Numerology — Planet-Number System

Vedic numerology assigns single digits 1–9 to planets:

| Number | Planet | Bengali |
|--------|--------|---------|
| 1 | Sun | সূর্য |
| 2 | Moon | চন্দ্র |
| 3 | Jupiter | বৃহস্পতি |
| 4 | Rahu / Uranus | রাহু |
| 5 | Mercury | বুধ |
| 6 | Venus | শুক্র |
| 7 | Ketu / Neptune | কেতু |
| 8 | Saturn | শনি |
| 9 | Mars | মঙ্গল |

### 7.2 Birth Number (Moolank / মূলাঙ্ক)

**Definition:** Derived from the **day of birth** (date only, not month/year).

**Formula:**
```
Birth Number = Sum of digits of birth date, reduced to single digit

If sum > 9: add digits of sum again, repeat until single digit
Exception: 11, 22, 33 are sometimes kept as Master Numbers
```

**Examples:**
- Born on 7th: Birth Number = 7
- Born on 15th: 1 + 5 = 6, Birth Number = 6
- Born on 29th: 2 + 9 = 11 → 1 + 1 = 2, Birth Number = 2
- Born on 19th: 1 + 9 = 10 → 1 + 0 = 1, Birth Number = 1

### 7.3 Destiny Number (Bhagyanank / ভাগ্যাঙ্ক)

**Definition:** Derived from the **full date of birth** (day + month + year).

**Formula:**
```
Destiny Number = Sum of ALL digits of full birthdate, reduced to single digit
```

**Example:** Born 15 August 1990 = 15/08/1990
```
1 + 5 + 0 + 8 + 1 + 9 + 9 + 0 = 33 → 3 + 3 = 6
Destiny Number = 6
```

**Example:** Born 7 March 1985 = 07/03/1985
```
0 + 7 + 0 + 3 + 1 + 9 + 8 + 5 = 33 → 3 + 3 = 6
Destiny Number = 6
```

### 7.4 Lucky Number from Nakshatra

**Method:** Nakshatra Lord → Planet Number = Lucky Number

| Nakshatra Lord | Lucky Number |
|----------------|-------------|
| Sun | 1 |
| Moon | 2 |
| Mars | 9 |
| Rahu | 4 |
| Jupiter | 3 |
| Saturn | 8 |
| Mercury | 5 |
| Ketu | 7 |
| Venus | 6 |

**Example:** Nakshatra = Chitra (Mars-ruled) → Lucky Number = **9**

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 8. নামের আদ্যাক্ষর — Suggested Name First Letter (Nama Akshara System)

---

### 8.1 The Phonetic Tradition

In Vedic tradition, the **birth Nakshatra** and **Pada** determine the auspicious starting syllable (আদ্যাক্ষর / Namaakshara) for naming a child. This is called **Namakarana Samskara** (নামকরণ সংস্কার).

**Principle:** Each Pada of each Nakshatra is associated with a specific Sanskrit seed syllable (Bija / বীজ) that carries the vibrational energy of that cosmic region.

### 8.2 Complete Nakshatra-Pada-Syllable Table

The syllables below are the traditional Sanskrit/Bengali sounds:

| Nak # | Nakshatra | Pada 1 | Pada 2 | Pada 3 | Pada 4 |
|-------|-----------|--------|--------|--------|--------|
| 1 | Ashvini | চু (Chu) | চে (Che) | চো (Cho) | লা (La) |
| 2 | Bharani | লী (Li) | লু (Lu) | লে (Le) | লো (Lo) |
| 3 | Krittika | আ (A) | ই (I) | উ (U) | এ (E) |
| 4 | Rohini | ও (O) | বা (Va/Ba) | বি (Vi/Bi) | বু (Vu/Bu) |
| 5 | Mrigashira | বে (Ve) | বো (Vo) | কা (Ka) | কি (Ki) |
| 6 | Ardra | কু (Ku) | ঘ (Gha) | ঙ (Nga) | ছ (Chha) |
| 7 | Punarvasu | কে (Ke) | কো (Ko) | হা (Ha) | হি (Hi) |
| 8 | Pushya | হু (Hu) | হে (He) | হো (Ho) | ড (Da) |
| 9 | Ashlesha | ডি (Di) | ডু (Du) | ডে (De) | ডো (Do) |
| 10 | Magha | মা (Ma) | মি (Mi) | মু (Mu) | মে (Me) |
| 11 | Purva Phalguni | মো (Mo) | টা (Ta) | টি (Ti) | টু (Tu) |
| 12 | Uttara Phalguni | টে (Te) | টো (To) | পা (Pa) | পি (Pi) |
| 13 | Hasta | পু (Pu) | ষ (Sha) | ণ (Na) | ঠ (Tha) |
| 14 | Chitra | পে (Pe) | পো (Po) | রা (Ra) | রি (Ri) |
| 15 | Swati | রু (Ru) | রে (Re) | রো (Ro) | তা (Ta) |
| 16 | Vishakha | তি (Ti) | তু (Tu) | তে (Te) | তো (To) |
| 17 | Anuradha | না (Na) | নি (Ni) | নু (Nu) | নে (Ne) |
| 18 | Jyeshtha | নো (No) | যা (Ya) | যি (Yi) | যু (Yu) |
| 19 | Moola | যে (Ye) | যো (Yo) | ভা (Bha) | ভি (Bhi) |
| 20 | Purvashadha | ভু (Bhu) | ধা (Dha) | ফা (Pha/Fa) | ঢ (Dha) |
| 21 | Uttarashadha | ভে (Bhe) | ভো (Bho) | জা (Ja) | জি (Ji) |
| 22 | Shravana | খি (Khi) | খু (Khu) | খে (Khe) | খো (Kho) |
| 23 | Dhanishtha | গা (Ga) | গি (Gi) | গু (Gu) | গে (Ge) |
| 24 | Shatabhisha | গো (Go) | সা (Sa) | সি (Si) | সু (Su) |
| 25 | Purva Bhadrapada | সে (Se) | সো (So) | দা (Da) | দি (Di) |
| 26 | Uttara Bhadrapada | দু (Du) | থ (Tha) | ঝ (Jha) | ঞ (Jna) |
| 27 | Revati | দে (De) | দো (Do) | চ (Cha) | চি (Chi) |

### 8.3 How to Determine Name Letter

**Step 1:** Calculate birth Moon sidereal longitude  
**Step 2:** Find Nakshatra number  
**Step 3:** Find Pada number  
**Step 4:** Look up table → first syllable = ideal name starting sound

**Example:** Moon at Chitra Pada 4:
- Table: Chitra Pada 4 = রি (Ri)
- Suggested name starts with: **Ri** — e.g., Riya (রিয়া), Rita (রিতা), Rini (রিণি)

**Bengali Phonetic Notes:**
- চ = Ch sound (as in "church")
- ক = K sound
- ট = T (retroflex)
- ব/ভ = B/Bh sound
- র = R (rolling R)

---

# PART II — DASHA SYSTEM

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 9. বিমশোত্তরী দশা (Vimshottari Mahadasha)

---

### 9.1 Origin and Philosophy

**Vimshottari** (বিমশোত্তরী) literally means "120" in Sanskrit (Vimsha = 20, Uttara = beyond → "120"). It is the **most universally used** Dasha (planetary period) system in all Vedic astrology.

**Core Premise:**  
Human life is considered to span **120 years** (the maximum lifespan according to Vedic tradition). The 9 planets divide this 120-year span among themselves in a fixed sequence, with each planet ruling for a specific number of years.

**The Moon-Nakshatra Connection:**  
The Dasha system is anchored to the **Moon's Nakshatra at birth**. The Nakshatra's lord is the ruling planet of the **first Dasha period** at birth (with proportionate balance remaining).

### 9.2 The Fixed Dasha Sequence and Durations

The 9 planets rule for the following fixed years (total = 120):

| # | Planet | Bengali | Years | Fraction of 120 |
|---|--------|---------|-------|-----------------|
| 1 | Ketu | কেতু | 7 | 7/120 |
| 2 | Venus | শুক্র | 20 | 20/120 = 1/6 |
| 3 | Sun | সূর্য | 6 | 6/120 = 1/20 |
| 4 | Moon | চন্দ্র | 10 | 10/120 = 1/12 |
| 5 | Mars | মঙ্গল | 7 | 7/120 |
| 6 | Rahu | রাহু | 18 | 18/120 = 3/20 |
| 7 | Jupiter | বৃহস্পতি | 16 | 16/120 = 2/15 |
| 8 | Saturn | শনি | 19 | 19/120 |
| 9 | Mercury | বুধ | 17 | 17/120 |

**Sum verification:** 7 + 20 + 6 + 10 + 7 + 18 + 16 + 19 + 17 = **120** ✓

**The Cycle:** After Mercury's 17 years, it returns to Ketu's 7 years. The cycle repeats indefinitely.

**Traditional Reasoning for these Numbers:**  
The numbers correlate with the **proportion of the 27 Nakshatras** each planet rules:
- Each planet rules exactly 3 Nakshatras (out of 27)
- Planet's years = (3/27) × 120 × adjustment factor... but more precisely, the ratios are fixed by Parashara's original system.
- Ketu: 7, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17, Venus: 20

Nakshatra–Dasha lord mapping (each repeated 3 times in the 27):

| Dasha Lord | Nakshatras Ruled |
|------------|-----------------|
| Ketu | Ashvini, Magha, Moola |
| Venus | Bharani, Purva Phalguni, Purvashadha |
| Sun | Krittika, Uttara Phalguni, Uttarashadha |
| Moon | Rohini, Hasta, Shravana |
| Mars | Mrigashira, Chitra, Dhanishtha |
| Rahu | Ardra, Swati, Shatabhisha |
| Jupiter | Punarvasu, Vishakha, Purva Bhadrapada |
| Saturn | Pushya, Anuradha, Uttara Bhadrapada |
| Mercury | Ashlesha, Jyeshtha, Revati |

---

### 9.3 Dasha Balance Calculation at Birth

At birth, the person is partway through the Dasha of the Nakshatra lord of the birth Moon. The **balance remaining** in that Dasha is calculated from how far the Moon has traveled through that Nakshatra.

#### Step 1: Find position within Nakshatra

```
Position_in_Nakshatra = λ_moon − Nakshatra_Start_Degree
Nakshatra_Start_Degree = (Nakshatra_Index) × (360/27)
```

#### Step 2: Calculate proportion REMAINING in Nakshatra

```
Proportion_Elapsed = Position_in_Nakshatra / (360/27)
                   = Position_in_Nakshatra / 13.3333°

Proportion_Remaining = 1 − Proportion_Elapsed
```

#### Step 3: Calculate Dasha Balance

```
Dasha_Balance_Years = Proportion_Remaining × Dasha_Years_of_Lord
```

Convert fractional years to years, months, days:
```
Years = Integer part of Dasha_Balance_Years
Remaining_months_decimal = Fractional_part × 12
Months = Integer part of Remaining_months_decimal
Remaining_days_decimal = Fractional_part of Months_decimal × 30.4375
Days = Round(Remaining_days_decimal)
```

#### Complete Example

**Birth Moon:** λ = 186°24'19" = 186.405° (Chitra, Pada 4)  
**Nakshatra:** Chitra (Index 13, Lord = Mars, Dasha = 7 years)

```
Nakshatra_Start = 13 × (360/27) = 13 × 13.3333° = 173.333°
Position_in_Nak = 186.405° − 173.333° = 13.072°
Proportion_Elapsed = 13.072 / 13.333 = 0.9804
Proportion_Remaining = 1 − 0.9804 = 0.0196

Dasha_Balance = 0.0196 × 7 years = 0.1372 years

Convert:
0.1372 years × 12 = 1.646 months
1 month, 0.646 × 30.4375 = 19.66 days ≈ 20 days

Remaining Mars Dasha = 0 years, 1 month, 20 days
```

This means: at birth, approximately **1 month 20 days** of Mars Mahadasha remains.

---

### 9.4 Timeline of All Dashas from Birth

After the balance of the first Dasha, full Dashas proceed in sequence:

```
Sequence starting from Nakshatra Lord, cycling through:
Ketu → Venus → Sun → Moon → Mars → Rahu → Jupiter → Saturn → Mercury → (back to Ketu)
```

**Start Date of Each Dasha:**
```
Dasha_N_Start = Birth_Date + Balance_of_First_Dasha + Sum(all previous full Dashas)
Dasha_N_End = Dasha_N_Start + Years_of_Dasha_N
```

**Days conversion:** Use 365.25 days per year for precision.
```
1 year = 365.25 days
```

**Example Timeline** (Birth: 15 August 1985, Mars balance = 0y 1m 20d):

| Dasha | Start | End | Duration |
|-------|-------|-----|----------|
| Mars (balance) | 15 Aug 1985 | ~5 Oct 1985 | 1m 20d |
| Rahu | 5 Oct 1985 | 5 Oct 2003 | 18 years |
| Jupiter | 5 Oct 2003 | 5 Oct 2019 | 16 years |
| Saturn | 5 Oct 2019 | 5 Oct 2038 | 19 years |
| Mercury | 5 Oct 2038 | 5 Oct 2055 | 17 years |
| Ketu | 5 Oct 2055 | 5 Oct 2062 | 7 years |
| Venus | 5 Oct 2062 | 5 Oct 2082 | 20 years |

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 10. অন্তর্দশা (Antardasha) — Sub-Period

---

### 10.1 Theory

Within each Mahadasha (major period), there are **9 Antardashas** (sub-periods), one for each planet. The Antardasha durations are proportional to the Mahadasha planet's ratio within the 120-year cycle.

**The Nested Logic:**
- The 120-year cycle is the master cycle.
- Within each planet's Mahadasha, the same 120-year proportional scheme applies to distribute the Mahadasha duration among all 9 planets.
- The **Mahadasha planet's own Antardasha comes first**, then the sequence continues from the next planet.

### 10.2 Antardasha Duration Formula

```
Antardasha_Duration (in years) = 
    (Mahadasha_Planet_Years × Antardasha_Planet_Years) / 120
```

**Example: During Rahu Mahadasha (18 years):**

| Antardasha Planet | Years | Calculation | Duration |
|-------------------|-------|-------------|----------|
| Rahu | 18 | (18 × 18)/120 | 2.7 years = 2y 8m 12d |
| Jupiter | 16 | (18 × 16)/120 | 2.4 years = 2y 4m 24d |
| Saturn | 19 | (18 × 19)/120 | 2.85 years = 2y 10m 6d |
| Mercury | 17 | (18 × 17)/120 | 2.55 years = 2y 6m 18d |
| Ketu | 7 | (18 × 7)/120 | 1.05 years = 1y 0m 18d |
| Venus | 20 | (18 × 20)/120 | 3.0 years = 3y 0m 0d |
| Sun | 6 | (18 × 6)/120 | 0.9 years = 10m 24d |
| Moon | 10 | (18 × 10)/120 | 1.5 years = 1y 6m 0d |
| Mars | 7 | (18 × 7)/120 | 1.05 years = 1y 0m 18d |
| **Total** | | | **18 years** ✓ |

**Verification:** 2.7 + 2.4 + 2.85 + 2.55 + 1.05 + 3.0 + 0.9 + 1.5 + 1.05 = 18.0 ✓

### 10.3 Converting Fractional Years to Y/M/D

Use the standard 365.25 days/year, 30.4375 days/month:

```
Total_days = Fractional_years × 365.25
Years = floor(Total_days / 365.25)
Remaining_days = Total_days − (Years × 365.25)
Months = floor(Remaining_days / 30.4375)
Days = round(Remaining_days − (Months × 30.4375))
```

**Example:** 2.7 years
```
Total_days = 2.7 × 365.25 = 986.175 days
Years = floor(986.175 / 365.25) = 2
Remaining = 986.175 − 730.5 = 255.675 days
Months = floor(255.675 / 30.4375) = floor(8.4) = 8
Days = round(255.675 − 243.5) = round(12.175) = 12
→ 2 years 8 months 12 days
```

### 10.4 Antardasha Sequence Within Any Mahadasha

**The Antardasha sequence starts with the Mahadasha planet itself**, then proceeds in the standard order:

Standard order: Ketu → Venus → Sun → Moon → Mars → Rahu → Jupiter → Saturn → Mercury

**If Mahadasha = Rahu, the Antardasha sequence is:**
Rahu → Jupiter → Saturn → Mercury → Ketu → Venus → Sun → Moon → Mars

(Start at Rahu, then continue in standard order, wrapping around)

**General Rule:**
```
Antardasha sequence = Mahadasha planet first, then the next planet in the 
standard cycle, continuing through all 9, wrapping as needed.
```

### 10.5 Pratyantardasha (Sub-Sub-Period)

A third level (sub-sub-period) can be calculated:
```
Pratyantardasha_Duration = 
    (Antardasha_Planet_Years × Pratyantardasha_Planet_Years) / 120
```

And so on for Sookshma (4th level) and Prana (5th level), using the same proportional formula.

### 10.6 Full Step-by-Step Antardasha Timeline Generation

**Given:** Rahu Mahadasha starting 5 October 1985

**Step 1:** List Antardasha durations (years):
- Rahu: 2.7, Jupiter: 2.4, Saturn: 2.85, Mercury: 2.55, Ketu: 1.05, Venus: 3.0, Sun: 0.9, Moon: 1.5, Mars: 1.05

**Step 2:** Convert to days:
- Rahu: 986 days, Jupiter: 876 days, Saturn: 1041 days, Mercury: 931 days, Ketu: 384 days, Venus: 1096 days, Sun: 329 days, Moon: 548 days, Mars: 384 days

**Step 3:** Add cumulatively from start date:

| Antardasha | Start | Days Added | End |
|------------|-------|-----------|-----|
| Rahu-Rahu | 5 Oct 1985 | 986 | 17 Jun 1988 |
| Rahu-Jupiter | 17 Jun 1988 | 876 | 11 Dec 1990 |
| Rahu-Saturn | 11 Dec 1990 | 1041 | 17 Sep 1993 |
| Rahu-Mercury | 17 Sep 1993 | 931 | 5 Apr 1996 |
| Rahu-Ketu | 5 Apr 1996 | 384 | 23 Apr 1997 |
| Rahu-Venus | 23 Apr 1997 | 1096 | 23 Apr 2000 |
| Rahu-Sun | 23 Apr 2000 | 329 | 17 Mar 2001 |
| Rahu-Moon | 17 Mar 2001 | 548 | 17 Sep 2002 |
| Rahu-Mars | 17 Sep 2002 | 384 | 5 Oct 2003 |

---

# PART III — MATHEMATICAL FOUNDATIONS

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 11. Traditional Astrology Mathematics

---

### 11.1 Degree Arithmetic — The Fundamental Operations

All astrological calculations use circular arithmetic on angles.

#### Addition:
```
(A°B'C") + (D°E'F") :
1. C + F → if ≥ 60: subtract 60, carry 1 to minutes
2. B + E + carry → if ≥ 60: subtract 60, carry 1 to degrees
3. A + D + carry → if ≥ 360: subtract 360
```

**Example:** 347°45'30" + 25°30'45"
```
Seconds: 30 + 45 = 75 → 75 − 60 = 15", carry 1
Minutes: 45 + 30 + 1 = 76 → 76 − 60 = 16', carry 1
Degrees: 347 + 25 + 1 = 373 → 373 − 360 = 13°
Result: 13°16'15"
```

#### Subtraction:
```
(A°B'C") − (D°E'F") :
1. C − F → if < 0: add 60, borrow 1 from minutes
2. B − E − borrow → if < 0: add 60, borrow 1 from degrees
3. A − D − borrow → if < 0: add 360
```

**Example:** 10°15'20" − 25°45'50"
```
Seconds: 20 − 50 = −30 → 30 + 60 = 30", borrow 1 minute
Minutes: 15 − 45 − 1 = −31 → 31 + 60 = 29', borrow 1 degree
Degrees: 10 − 25 − 1 = −16 → −16 + 360 = 344°
Result: 344°29'30"
```

---

### 11.2 Modulo 360 — Circular Mathematics

The zodiac is circular. All longitudes must stay in [0°, 360°):

```
Normalized = λ mod 360
```

**Rules:**
- If λ ≥ 360: subtract 360 repeatedly until < 360
- If λ < 0: add 360 repeatedly until ≥ 0

**In DMS form:**
```
If result ≥ 360°: subtract 360°00'00"
If result < 0°: add 360°00'00"
```

---

### 11.3 Aspect Calculation (Drishti)

The angular distance between two planets:

```
Angular_Distance = |λ₁ − λ₂|
If Angular_Distance > 180°: Angular_Distance = 360° − Angular_Distance
```

This gives the **shorter arc** between two planets (0° to 180°).

**Standard Vedic Aspects (Full Aspects = 100% strength):**
- 7th aspect: 180° (opposition)
- Mars: 4th (90°) and 8th (210°/150° from Mars) aspects
- Jupiter: 5th (120°) and 9th (240°/120°) aspects
- Saturn: 3rd (60°) and 10th (270°/90°) aspects

**Aspect formula (from Planet A to Planet B):**
```
Aspect_Degree = (λ_B − λ_A + 360°) mod 360°
```

If this equals the aspect angle (allowing ±5° orb), the aspect exists.

---

### 11.4 House System Mathematics (Equal House / Bhava)

Vedic astrology typically uses **equal houses** (Samabhava):

```
House_1 starts at Lagna degree
House_N starts at: (Lagna + (N−1) × 30°) mod 360°
Each house = 30°
```

A planet is in House N if:
```
λ_planet falls within [House_N_start, House_N_start + 30°)
```

---

### 11.5 Longitude Difference — Shortest Arc

```
diff = (λ₂ − λ₁ + 360) mod 360
if diff > 180: shortest_arc = 360 − diff
else: shortest_arc = diff
```

---

### 11.6 Planetary Cycle Calculations

**Synodic Period** (time between conjunctions as seen from Earth):
```
1/P_synodic = 1/P_Earth − 1/P_planet    (for outer planets)
1/P_synodic = 1/P_planet − 1/P_Earth    (for inner planets)
```

Where P = orbital period in years.

**Traditional approximations:**
| Planet | Sidereal Period | Synodic Period |
|--------|----------------|----------------|
| Moon | 27.32 days | 29.53 days |
| Sun (apparent) | 365.25 days | — |
| Mars | 687 days (1.88 yr) | 779.9 days |
| Jupiter | 11.86 years | 398.9 days |
| Saturn | 29.46 years | 378.1 days |

---

### 11.7 Time Calculations

**Converting birth time to UT (Universal Time):**
```
UT = Local_Standard_Time − Time_Zone_Offset
```

India Standard Time (IST) = UT + 5h 30m = UT + 5.5h

```
UT = IST − 5h 30m
```

**Example:** Birth at 14:30 IST on 15 August 1985
```
UT = 14:30 − 5:30 = 9:00 UT
JD = 2446657.5 + (9/24) = 2446657.5 + 0.375 = 2446657.875
```

**Decimal time:**
```
Time_decimal = Hours + Minutes/60 + Seconds/3600
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 12. Birth Time Uncertainty — Traditional Approaches

---

### 12.1 Why Birth Time Matters

The **Lagna changes at approximately 1 sign per 2 hours** (on average), but more critically, each degree of Lagna shifts in approximately **4 minutes of clock time**.

This means:
- An error of ±4 minutes in birth time = ±1° error in Lagna
- An error of ±30 minutes = ±7°–8° in Lagna
- An error of ±2 hours = Lagna could shift to the next sign entirely

**Dasha balance** is affected mainly by Moon's position, which changes much more slowly (~13° per day = ~1° per 2 hours), so Dasha calculations are more stable.

---

### 12.2 Traditional Rectification Methods

#### Method 1: Udaya Lagna Rectification by Events

Astrologers know which Lagna positions correlate with certain life events. By matching known events to planetary periods and house placements, the birth time is adjusted until the chart matches lived reality.

**Example:** If a person married in a Jupiter Dasha, check if Jupiter is strong in the 7th house or aspecting the 7th lord — if not, slightly adjust Lagna until the chart fits.

#### Method 2: Nadiamsha / Nadi Techniques

Ultra-precise time rectification using the **Nadi system** — examining sub-degrees (Nadiamsha = 1/150th of a sign = 0.2°). Each Nadi position has specific predicted life events.

#### Method 3: Sensitivity Analysis (Rational Approach)

Given uncertain birth time ± T minutes:

```
Range of Lagna movement = T × 0.25° per minute (average)
                        = T/4 degrees
```

**Procedure:**
1. Calculate charts for:
   - Best estimate time
   - Best estimate − T minutes
   - Best estimate + T minutes
2. Note if Lagna changes sign across these three calculations.
3. If Lagna stays in the same sign: calculations are robust.
4. If Lagna could be in two possible signs: present both charts.

#### Method 4: Dashas as Anchor

Since Moon position is more stable (changes ~0.5° per hour vs Lagna's 15° per hour), the **Dasha timeline is far more reliable** than the exact Lagna.

```
Moon changes at: 13.2° per day ÷ 24 = 0.55° per hour
1° Moon error from uncertain time: 1/0.55 ≈ 1.8 hours uncertainty needed
```

So even with ±30 minutes birth time uncertainty, Moon's Nakshatra rarely changes.

---

### 12.3 Boundary Problems

**Lagna Boundary:** If calculated Lagna is within 1° of a sign boundary, treat with caution.

```
Boundary_Uncertainty = (Time_Uncertainty_Minutes / 4)°

If |Lagna_degree_in_sign − 30°| < Boundary_Uncertainty → uncertain (near end of sign)
If |Lagna_degree_in_sign − 0°| < Boundary_Uncertainty → uncertain (near start of sign)
```

**Nakshatra Boundary:** If Moon is within (Time_Uncertainty × 0.55°/hr) of a Nakshatra boundary:

```
Nakshatra_position_sensitivity = Time_Uncertainty_hours × 0.55° per hour

If Position_in_Nakshatra < sensitivity OR Position_in_Nakshatra > (13.333° − sensitivity)
→ Nakshatra may be adjacent; calculate both possibilities
```

---

### 12.4 Classical Panchanga Time Correction

Traditional Bengali astrologers using printed Panchanga apply a **longitude correction** to the local sidereal time:

```
LST_correction = (Birth_Longitude − Reference_Longitude) × 4 minutes per degree
```

India's IST reference meridian = 82.5°E  
Kolkata ≈ 88.37°E

```
LST_correction = (88.37 − 82.5) × 4 = 5.87 × 4 = 23.5 minutes
→ Kolkata births are ~23.5 minutes ahead of IST reference
```

This correction ensures the Sidereal Time used is accurate for the actual birth longitude, not just the time zone meridian.

---

# PART IV — QUICK REFERENCE COMPENDIUM

---

## Master Formula Summary

### Sign from Longitude
```
Sign = floor(λ / 30) + 1        where λ = sidereal longitude [0°, 360°)
Degree in sign = λ − (Sign − 1) × 30
```

### Nakshatra from Moon Longitude
```
Nakshatra = floor(λ_moon × 27 / 360) + 1
Position in Nak = λ_moon − ((Nakshatra − 1) × 13.3333°)
```

### Pada from Position in Nakshatra
```
Pada = floor(Position_in_Nak × 4 / 13.3333°) + 1    [1 to 4]
```

### Dasha Balance
```
Elapsed_fraction = Position_in_Nak / 13.3333°
Remaining_fraction = 1 − Elapsed_fraction
Balance_years = Remaining_fraction × Dasha_lord_years
```

### Antardasha Duration
```
AD_years = (MD_years × AD_planet_years) / 120
```

### Sidereal Longitude
```
λ_sidereal = λ_tropical − Ayanamsa
```

### Ketu from Rahu
```
Ketu = (Rahu + 180°) mod 360°
```

### Longitude Normalization
```
λ_norm = ((λ mod 360) + 360) mod 360
```

---

## Nakshatra–Dasha Years Quick Reference

| Nak | Name | Lord | Years |
|-----|------|------|-------|
| 1 | Ashvini | Ketu | 7 |
| 2 | Bharani | Venus | 20 |
| 3 | Krittika | Sun | 6 |
| 4 | Rohini | Moon | 10 |
| 5 | Mrigashira | Mars | 7 |
| 6 | Ardra | Rahu | 18 |
| 7 | Punarvasu | Jupiter | 16 |
| 8 | Pushya | Saturn | 19 |
| 9 | Ashlesha | Mercury | 17 |
| 10 | Magha | Ketu | 7 |
| 11 | Purva Phalguni | Venus | 20 |
| 12 | Uttara Phalguni | Sun | 6 |
| 13 | Hasta | Moon | 10 |
| 14 | Chitra | Mars | 7 |
| 15 | Swati | Rahu | 18 |
| 16 | Vishakha | Jupiter | 16 |
| 17 | Anuradha | Saturn | 19 |
| 18 | Jyeshtha | Mercury | 17 |
| 19 | Moola | Ketu | 7 |
| 20 | Purvashadha | Venus | 20 |
| 21 | Uttarashadha | Sun | 6 |
| 22 | Shravana | Moon | 10 |
| 23 | Dhanishtha | Mars | 7 |
| 24 | Shatabhisha | Rahu | 18 |
| 25 | Purva Bhadrapada | Jupiter | 16 |
| 26 | Uttara Bhadrapada | Saturn | 19 |
| 27 | Revati | Mercury | 17 |

---

## Complete Worked Example — Birth: 15 August 1985, 14:30 IST, Kolkata (88.37°E, 22.57°N)

**Assume (from Panchanga):**
- Moon tropical longitude at birth = 210°15'30"
- Ayanamsa (1985) ≈ 23°40' (approximately)

**Step 1: Moon Sidereal Longitude**
```
λ_moon = 210°15'30" − 23°40'00" = 186°35'30" ≈ 186.592°
```

**Step 2: Moon Rashi**
```
Sign = floor(186.592 / 30) + 1 = floor(6.22) + 1 = 6 + 1 = 7 → Tula (Libra)
Degree in Tula = 186.592 − 180 = 6.592° = 6°35'30"
```

**Step 3: Nakshatra**
```
Nak = floor(186.592 × 27 / 360) + 1 = floor(14.0) + 1 = 14 + 1...
      Wait: 186.592 × 27 / 360 = 13.994
      Nak = floor(13.994) + 1 = 13 + 1 = 14 → Chitra (Mars, 7 years)
```

**Step 4: Nakshatra Position**
```
Nak_start = 13 × 13.333° = 173.333°
Position_in_Nak = 186.592 − 173.333 = 13.259°
```

**Step 5: Pada**
```
Pada = floor(13.259 / 3.333) + 1 = floor(3.977) + 1 = 3 + 1 = 4
→ Chitra Pada 4
```

**Step 6: Dasha Balance**
```
Elapsed = 13.259 / 13.333 = 0.9944 (99.44% through Chitra)
Remaining = 1 − 0.9944 = 0.0056
Balance = 0.0056 × 7 years = 0.0392 years = 14.3 days ≈ 14 days
```

**Step 7: Name Letter**
- Chitra Pada 4 → **রি (Ri)**

**Step 8: Gana, Varna, Lucky Items**
- Chitra: Gana = Rakshasa (রাক্ষস)
- Nakshatra Lord = Mars → Varna = Kshatriya, Lucky Day = Tuesday, Lucky Color = Red, Lucky Number = 9

**Step 9: Dasha Timeline**
| Dasha | Starts |
|-------|--------|
| Mars (balance 14d) | 15 Aug 1985 |
| Rahu (18 yr) | 29 Aug 1985 |
| Jupiter (16 yr) | 29 Aug 2003 |
| Saturn (19 yr) | 29 Aug 2019 |
| Mercury (17 yr) | 29 Aug 2038 |

---

## Common Mistakes and Edge Cases

### Mistake 1: Forgetting Ayanamsa
Always subtract Ayanamsa from tropical longitude before calculating Rashi, Nakshatra, Lagna.

### Mistake 2: Not Normalizing
After subtraction, longitude may go negative. Always add 360° if result < 0.

### Mistake 3: Wrong Antardasha Start
The first Antardasha in any Mahadasha is always the **Mahadasha planet's own Antardasha**, not Ketu.

### Mistake 4: Ketu Direction
Ketu = Rahu + 180°, **not** Rahu − 180° (though both give the same result after normalization mod 360°).

### Edge Case: Moon exactly on Nakshatra boundary
If Position_in_Nak ≈ 0° or ≈ 13°20', check carefully whether Moon is in this Nakshatra or the adjacent one. Use DMS arithmetic, not decimal rounding.

### Edge Case: Lagna at 0° Aries
λ_lagna = 0° is valid — it means the very beginning of Aries. Sign = 1 (Mesha), degree = 0°00'00".

### Edge Case: Dasha Balance = 0
If the Moon is exactly at the start of a Nakshatra (Position_in_Nak = 0), the person is at the very beginning of that Dasha (100% balance remaining = full Dasha years ahead).

---

## Glossary — Sanskrit/Bengali Terms

| Term | Bengali | Sanskrit | Meaning |
|------|---------|----------|---------|
| Zodiac | রাশি চক্র | Rāśi Cakra | Circle of signs |
| Sign | রাশি | Rāśi | Constellation division |
| Ascendant | লগ্ন | Lagna | Rising sign |
| Star division | নক্ষত্র | Nakṣatra | Lunar mansion |
| Quarter | পাদ | Pāda | Foot/quarter |
| Precession | অয়নচলন | Ayana-calana | Equinox movement |
| Correction | অয়নাংশ | Āyanāṃśa | Precession angle |
| Period | দশা | Daśā | Planetary period |
| Sub-period | অন্তর্দশা | Antardasā | Inner period |
| Cosmic temperament | গণ | Gaṇa | Group/tribe |
| Caste | বর্ণ | Varṇa | Color/class |
| Planet | গ্রহ | Graha | Seizer |
| House | ভাব | Bhāva | State/condition |
| Aspect | দৃষ্টি | Dṛṣṭi | Sight/gaze |
| Almanac | পঞ্জিকা | Pañcāṅga | Five-limbed (calendar) |
| Sidereal time | নাক্ষত্রিক কাল | Sāvana Kāla | Star-time |
| Latitude | অক্ষাংশ | Akṣāṃśa | Axial degrees |
| Longitude | দ্রাঘিমাংশ | Deśāntra | Place-difference |
| Retrograde | বক্রগতি | Vakra-gati | Curved motion |
| Conjunction | যুতি | Yuti | Union |

---

*End of Document*

---

**Document Version:** Complete Edition  
**Tradition:** Vedic / Bengali Jyotisha — Manual Calculation Methods  
**Scope:** All 13 topics with formulas, tables, examples, edge cases  
**Language:** English with Bengali/Sanskrit terminology throughout
