import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, TestTube } from "lucide-react";
import { trackClick } from "@/utils/clickTracking";

const Index = () => {
  // Black Friday Deal - Massage Gun with tracking code joshrelay-20
  const testUrl = "https://www.amazon.com/CAMEFER-Portable-Percussion-Massagers-Attachments/dp/B0FGWM5W1C/ref=sr_1_4_sspa?dib=eyJ2IjoiMSJ9.Wb-130ZotcD0eHHCASLoIT8tWqQq4dNZi1iOF1xIplnA1gNNA_imMxFwuIdAYQhSVkHe1sK4OQxPkfdnHOIa93pVa9JfASEfPq7PqF2PB8ZBIhp_9M6Nm5ap12vzh2Qqy84BqNjCeGejYRaDUHff08XNlV5p9SFnPeTwdG6BgQuzLpeiEJlY9y3NhGaJTabCd6iw2gR6RwpnFRDvdVo6oMg2Eq6g95B3qdP5HdID2r0FPiGqlb2N23BqNfqqkJu1lV5LKMReFphmXbcKUHbmgxgoPb7Xmqgg2MZOUhPR3pI.fUTScfSUz8UBpV7P9iqlcX17y4BtYW402IWUbRHiBRs&dib_tag=se&keywords=massager&qid=1764084001&sr=8-4-spons&sp_csd=d2lkZ2V0TmFtZT1zcF9hdGY&th=1&tag=joshrelay-20";

  const handleTestClick = async () => {
    await trackClick({
      dealId: "black-friday-massage-gun-b0fgwm5w1c",
      targetUrl: testUrl,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">
              Welcome to Relay Station
            </h1>
            <p className="text-xl text-muted-foreground">
              Your affiliate deal tracking and management platform
            </p>
          </div>

          <Card className="border-2 border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-center gap-2 mb-2">
                <TestTube className="h-6 w-6 text-primary" />
                <CardTitle>Test Tracking Link</CardTitle>
              </div>
              <CardDescription>
                Click below to test the affiliate link tracking system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-mono break-all text-muted-foreground">
                    Tag: joshrelay-20
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Product: Massage Gun (B0FGWM5W1C) - Black Friday Deal
                  </p>
                </div>
                
                <Button 
                  size="lg" 
                  className="w-full"
                  asChild
                >
                  <a
                    href={testUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    onClick={handleTestClick}
                  >
                    View Black Friday Deal
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>

                <p className="text-xs text-muted-foreground">
                  This will track the click in your analytics and open Amazon
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">View Deals</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/deals">Browse All Deals</a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/projects">Manage Projects</a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI Generator</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/social-links-generator">Generate Content</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
