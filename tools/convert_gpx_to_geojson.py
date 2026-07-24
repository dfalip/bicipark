import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


def local_name(tag):
    return tag.split("}")[-1]


def read_point(element):
    latitude = element.get("lat")
    longitude = element.get("lon")

    if latitude is None or longitude is None:
        raise ValueError("Punt GPX sense latitud o longitud.")

    coordinate = [float(longitude), float(latitude)]

    for child in element:
        if local_name(child.tag) == "ele" and child.text:
            coordinate.append(float(child.text))
            break

    return coordinate


def convert_gpx(input_file, output_file):
    input_path = Path(input_file)
    output_path = Path(output_file)

    if not input_path.exists():
        raise FileNotFoundError(f"No existeix el GPX: {input_path}")

    tree = ET.parse(input_path)
    root = tree.getroot()

    segments = []

    # Tracks GPX: trk > trkseg > trkpt
    for element in root.iter():
        if local_name(element.tag) != "trkseg":
            continue

        points = []

        for child in element:
            if local_name(child.tag) == "trkpt":
                points.append(read_point(child))

        if len(points) >= 2:
            segments.append(points)

    # Si no hi ha track, prova amb una ruta GPX: rte > rtept
    if not segments:
        route_points = []

        for element in root.iter():
            if local_name(element.tag) == "rtept":
                route_points.append(read_point(element))

        if len(route_points) >= 2:
            segments.append(route_points)

    if not segments:
        raise ValueError(
            "El fitxer GPX no conté cap track o ruta amb almenys dos punts."
        )

    if len(segments) == 1:
        geometry = {
            "type": "LineString",
            "coordinates": segments[0]
        }
    else:
        geometry = {
            "type": "MultiLineString",
            "coordinates": segments
        }

    total_points = sum(len(segment) for segment in segments)

    geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "name": input_path.stem.replace("-", " ").title(),
                    "source": input_path.name,
                    "pointsCount": total_points
                },
                "geometry": geometry
            }
        ]
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w", encoding="utf-8") as file:
        json.dump(geojson, file, ensure_ascii=False, indent=2)

    print(f"Conversió completada.")
    print(f"Punts processats: {total_points}")
    print(f"Fitxer creat: {output_path.resolve()}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(
            "Ús: py convert_gpx_to_geojson.py "
            "entrada.gpx sortida.geojson"
        )
        sys.exit(1)

    try:
        convert_gpx(sys.argv[1], sys.argv[2])
    except Exception as error:
        print(f"Error: {error}")
        sys.exit(1)