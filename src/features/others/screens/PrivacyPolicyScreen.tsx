// features/others/screens/PrivacyPolicyScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import { useTheme } from '@app/providers/ThemeContext';

export default function PrivacyPolicyScreen() {
    const { colors } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScreenHeader title="นโยบายความเป็นส่วนตัว" />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={[styles.lastUpdate, { color: colors.subText }]}>
                    อัปเดตล่าสุด: 27 มกราคม 2569
                </Text>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        1. ข้อมูลที่เราเก็บรวบรวม
                    </Text>
                    <Text style={[styles.paragraph, { color: colors.subText }]}>
                        เราเก็บรวบรวมข้อมูลต่อไปนี้เมื่อคุณใช้งานแอปพลิเคชันของเรา:{'\n\n'}
                        • ข้อมูลส่วนบุคคล: ชื่อ, อีเมล, เบอร์โทรศัพท์{'\n'}
                        • ข้อมูลที่อยู่: สำหรับการจัดส่งสินค้า{'\n'}
                        • ข้อมูลการชำระเงิน: ข้อมูลบัตรเครดิต/เดบิต หรือบัญชีธนาคาร{'\n'}
                        • ประวัติการสั่งซื้อ: รายการสินค้าที่คุณซื้อ
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        2. วัตถุประสงค์ในการใช้ข้อมูล
                    </Text>
                    <Text style={[styles.paragraph, { color: colors.subText }]}>
                        เราใช้ข้อมูลของคุณเพื่อ:{'\n\n'}
                        • ดำเนินการและจัดส่งคำสั่งซื้อของคุณ{'\n'}
                        • ติดต่อสื่อสารเกี่ยวกับคำสั่งซื้อ{'\n'}
                        • ส่งโปรโมชันและข้อเสนอพิเศษ (เฉพาะเมื่อคุณยินยอม){'\n'}
                        • ปรับปรุงประสบการณ์การใช้งานแอป{'\n'}
                        • ป้องกันการฉ้อโกงและดูแลความปลอดภัย
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        3. การเปิดเผยข้อมูล
                    </Text>
                    <Text style={[styles.paragraph, { color: colors.subText }]}>
                        เราอาจเปิดเผยข้อมูลของคุณให้กับ:{'\n\n'}
                        • ผู้ขายบนแพลตฟอร์มของเรา (เฉพาะข้อมูลที่จำเป็นต่อการจัดส่ง){'\n'}
                        • บริษัทขนส่ง (ชื่อ, ที่อยู่, เบอร์โทร){'\n'}
                        • ผู้ให้บริการชำระเงิน{'\n'}
                        • หน่วยงานราชการ (ตามที่กฎหมายกำหนด)
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        4. การรักษาความปลอดภัยข้อมูล
                    </Text>
                    <Text style={[styles.paragraph, { color: colors.subText }]}>
                        เราใช้มาตรการรักษาความปลอดภัยที่เหมาะสมเพื่อปกป้องข้อมูลของคุณ รวมถึง:{'\n\n'}
                        • การเข้ารหัสข้อมูลแบบ SSL/TLS{'\n'}
                        • การจัดเก็บรหัสผ่านแบบ Hash{'\n'}
                        • การจำกัดการเข้าถึงข้อมูลเฉพาะผู้ที่จำเป็น
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        5. สิทธิ์ของคุณ
                    </Text>
                    <Text style={[styles.paragraph, { color: colors.subText }]}>
                        คุณมีสิทธิ์:{'\n\n'}
                        • เข้าถึงและขอสำเนาข้อมูลของคุณ{'\n'}
                        • แก้ไขข้อมูลที่ไม่ถูกต้อง{'\n'}
                        • ลบบัญชีและข้อมูลของคุณ{'\n'}
                        • ยกเลิกการรับข่าวสารและโปรโมชัน{'\n'}
                        • ร้องเรียนต่อหน่วยงานที่เกี่ยวข้อง
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        6. ติดต่อเรา
                    </Text>
                    <Text style={[styles.paragraph, { color: colors.subText }]}>
                        หากคุณมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัว สามารถติดต่อเราได้ที่:{'\n\n'}
                        📧 Email: privacy@boxify.com{'\n'}
                        📞 โทร: 02-xxx-xxxx{'\n'}
                        🏢 ที่อยู่: กรุงเทพมหานคร ประเทศไทย
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    lastUpdate: {
        fontSize: 13,
        marginBottom: 20,
        fontStyle: 'italic',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 10,
    },
    paragraph: {
        fontSize: 15,
        lineHeight: 24,
    },
});
