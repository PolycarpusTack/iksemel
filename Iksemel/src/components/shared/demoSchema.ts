/**
 * Built-in demo XSD: a minimal broadcast schedule schema.
 * Extracted to a separate module to keep SchemaUpload.tsx under 200 lines.
 */

export const DEMO_BROADCAST_SCHEMA = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="BroadcastSchedule">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="Channel" maxOccurs="unbounded">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="ChannelCode" type="xs:string">
                <xs:annotation><xs:documentation>Unique channel identifier code</xs:documentation></xs:annotation>
              </xs:element>
              <xs:element name="ChannelName" type="xs:string">
                <xs:annotation><xs:documentation>Display name of the channel</xs:documentation></xs:annotation>
              </xs:element>
              <xs:element name="Slot" maxOccurs="unbounded">
                <xs:complexType>
                  <xs:sequence>
                    <xs:element name="SlotDate" type="xs:date">
                      <xs:annotation><xs:documentation>Broadcast date for this slot</xs:documentation></xs:annotation>
                    </xs:element>
                    <xs:element name="StartTime" type="xs:dateTime">
                      <xs:annotation><xs:documentation>Scheduled start time</xs:documentation></xs:annotation>
                    </xs:element>
                    <xs:element name="EndTime" type="xs:dateTime">
                      <xs:annotation><xs:documentation>Scheduled end time</xs:documentation></xs:annotation>
                    </xs:element>
                    <xs:element name="Duration" type="xs:duration" minOccurs="0">
                      <xs:annotation><xs:documentation>Duration in ISO 8601 format</xs:documentation></xs:annotation>
                    </xs:element>
                    <xs:element name="Programme">
                      <xs:complexType>
                        <xs:sequence>
                          <xs:element name="Title" type="xs:string">
                            <xs:annotation><xs:documentation>Programme title</xs:documentation></xs:annotation>
                          </xs:element>
                          <xs:element name="EpisodeTitle" type="xs:string" minOccurs="0">
                            <xs:annotation><xs:documentation>Episode title if applicable</xs:documentation></xs:annotation>
                          </xs:element>
                          <xs:element name="Genre" type="xs:string" minOccurs="0">
                            <xs:annotation><xs:documentation>Programme genre classification</xs:documentation></xs:annotation>
                          </xs:element>
                          <xs:element name="Rating" type="xs:string" minOccurs="0">
                            <xs:annotation><xs:documentation>Content rating (e.g., PG, 12, 16)</xs:documentation></xs:annotation>
                          </xs:element>
                          <xs:element name="Description" type="xs:string" minOccurs="0">
                            <xs:annotation><xs:documentation>Programme synopsis</xs:documentation></xs:annotation>
                          </xs:element>
                          <xs:element name="SeriesNumber" type="xs:integer" minOccurs="0" />
                          <xs:element name="EpisodeNumber" type="xs:integer" minOccurs="0" />
                        </xs:sequence>
                      </xs:complexType>
                    </xs:element>
                    <xs:element name="Status" type="xs:string" minOccurs="0">
                      <xs:annotation><xs:documentation>Slot status (Confirmed, Tentative, Cancelled)</xs:documentation></xs:annotation>
                    </xs:element>
                  </xs:sequence>
                </xs:complexType>
              </xs:element>
            </xs:sequence>
          </xs:complexType>
        </xs:element>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
